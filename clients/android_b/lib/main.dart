import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

import 'session.dart';
import 'storage.dart';
import 'transport.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SessionApp());
}

({SessionController session, SqliteWorkspace workspace}) configuredSession() {
  const configured = String.fromEnvironment('API_ORIGIN');
  final origin = Uri.parse(configured);
  Destination(origin);
  const ca = String.fromEnvironment('DEBUG_CA_BASE64');
  SecurityContext? context;
  if (ca.isNotEmpty) {
    if (kReleaseMode || !['127.0.0.1', 'localhost'].contains(origin.host)) {
      throw StateError(
        'CA de desarrollo solo para loopback y compilacion debug.',
      );
    }
    context = SecurityContext(withTrustedRoots: true)
      ..setTrustedCertificatesBytes(base64Decode(ca));
  }
  final workspace = SqliteWorkspace();
  return (
    session: SessionController(
      HttpsSessionApi(origin, context: context),
      KeystoreVault(origin),
      workspace,
    ),
    workspace: workspace,
  );
}

class SessionApp extends StatefulWidget {
  final SessionController? session;
  const SessionApp({super.key, this.session});
  @override
  State<SessionApp> createState() => _SessionAppState();
}

class _SessionAppState extends State<SessionApp> with WidgetsBindingObserver {
  SessionController? session;
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? configurationError;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    try {
      session = widget.session ?? configuredSession().session;
      session!.addListener(changed);
      boot();
    } catch (_) {
      configurationError =
          'Falta un origen HTTPS valido para esta instalacion.';
    }
  }

  void changed() {
    if (mounted) setState(() {});
  }

  Future<void> boot() async {
    await session!.boot();
    if (session!.state == SessionState.unverified) await session!.validate();
  }

  Future<void> action(Future<void> Function() work) async {
    setState(() => busy = true);
    try {
      await work();
    } finally {
      password.clear();
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        !busy &&
        session?.state == SessionState.online) {
      action(session!.validate);
    }
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      password.clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    session?.removeListener(changed);
    if (widget.session == null) session?.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Trazabilidad',
    theme: ThemeData(
      colorSchemeSeed: const Color(0xff185b44),
      useMaterial3: true,
    ),
    home: Scaffold(
      appBar: AppBar(title: const Text('Trazabilidad')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: content(),
            ),
          ),
        ),
      ),
    ),
  );
  Widget content() {
    if (configurationError != null) return Text(configurationError!);
    final s = session!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          s.state == SessionState.online
              ? 'Sesion validada'
              : 'Acceder a tu espacio',
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        if (busy)
          const LinearProgressIndicator(semanticsLabel: 'Verificando sesion'),
        if (s.failure != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              message(s.failure!),
              key: const Key('session-error'),
              semanticsLabel: message(s.failure!),
            ),
          ),
        if (s.remoteRevocation != null)
          Text(
            s.remoteRevocation!
                ? 'Sesion remota cerrada.'
                : 'Cierre local realizado. Revocacion remota no confirmada.',
            key: const Key('logout-result'),
          ),
        if (s.state == SessionState.online) ...[
          Text(
            'Organizacion: ${s.owner!.organizationId}',
            key: const Key('organization'),
          ),
          Text('Usuario: ${s.owner!.actorId}', key: const Key('actor')),
          const SizedBox(height: 16),
          const Text(
            'Espacio SQLite privado disponible. Tus datos pendientes se conservan al cerrar sesion. La captura y el envio estaran disponibles en otro incremento.',
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: busy ? null : () => action(s.validate),
            child: const Text('Verificar sesion'),
          ),
          FilledButton(
            onPressed: busy ? null : () => action(s.logout),
            child: const Text('Cerrar sesion'),
          ),
        ] else ...[
          TextField(
            controller: email,
            key: const Key('email'),
            decoration: const InputDecoration(labelText: 'Correo'),
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            enableSuggestions: false,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: password,
            key: const Key('password'),
            decoration: const InputDecoration(labelText: 'Contrasena'),
            obscureText: true,
            autocorrect: false,
            enableSuggestions: false,
            enableIMEPersonalizedLearning: false,
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: busy
                ? null
                : () => action(() => s.login(email.text.trim(), password.text)),
            child: const Text('Iniciar sesion'),
          ),
          if (s.state == SessionState.unverified ||
              s.failure == Failure.network)
            TextButton(
              onPressed: busy ? null : () => action(s.validate),
              child: const Text('Reintentar validacion'),
            ),
        ],
      ],
    );
  }

  String message(Failure f) => switch (f) {
    Failure.invalidCredentials => 'Correo o contrasena no validos.',
    Failure.needsLogin => 'La sesion termino. Inicia sesion de nuevo.',
    Failure.permission => 'No tienes permiso para esta operacion.',
    Failure.network =>
      'No se pudo verificar la conexion segura. Reintenta cuando tengas red.',
    Failure.conflict => 'Existe un conflicto que requiere revision.',
    Failure.storage => 'No se pudo abrir el almacenamiento seguro. Tus datos locales se conservan.',
    Failure.staleGeneration => 'La sesion cambio. Repite la operacion.',
    Failure.protocol => 'La respuesta no cumple el contrato de sesion.',
  };
}
