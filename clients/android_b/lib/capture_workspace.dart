import 'package:material_ui/material_ui.dart';

import 'capture_controller.dart';
import 'capture_policy.dart';
import 'capture_store.dart';
import 'session.dart';

class CaptureWorkspace extends StatelessWidget {
  final CaptureController controller;
  const CaptureWorkspace({super.key, required this.controller});
  @override
  Widget build(BuildContext context) {
    final c = controller;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Capturas de cosecha',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        Text(
          c.session.state == SessionState.online
              ? 'Sesión validada online'
              : 'Perfil local sin conexión validada',
        ),
        const Text(
          'Confirmar guarda en este dispositivo. Solo “Sincronizado” acredita aceptación del servidor.',
        ),
        if (c.busy)
          const LinearProgressIndicator(
            semanticsLabel: 'Consultando catálogo y sincronizando',
          ),
        if (c.notice != null) Text(c.notice!, key: const Key('capture-notice')),
        Text(
          c.profile == null
              ? 'Descarga el catálogo online antes de confirmar.'
              : 'Catálogo: ${c.parcels.length} parcelas. Validado ${c.profile!.window.serverTime.toIso8601String()} UTC. Ventana máxima 24 h; reiniciar el teléfono exige revalidar.',
        ),
        Wrap(
          spacing: 8,
          children: [
            FilledButton(
              onPressed: c.busy ? null : () => c.synchronize(manual: true),
              child: const Text('Sincronizar'),
            ),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => CaptureEditor(controller: c),
                ),
              ),
              child: const Text('Nueva captura'),
            ),
            TextButton(
              onPressed: () => c.logout(),
              child: const Text('Cerrar sesión'),
            ),
          ],
        ),
        if (c.rows.isEmpty)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Todavía no hay capturas en este perfil.'),
          ),
        for (final row in c.rows)
          Card(
            child: ListTile(
              title: Text(
                '${row.fields['quantity'] ?? ''} ${row.fields['unit'] ?? ''} · ${row.label}',
              ),
              subtitle: Text(
                '${row.id}\n${row.fields['harvestedAt'] ?? ''}\nIntentos: ${row.attempts}${row.code == null ? '' : ' · ${row.code}'}${row.action == null ? '' : '\n${row.action}'}',
              ),
              isThreeLine: true,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => CaptureEditor(controller: c, item: row),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class CaptureEditor extends StatefulWidget {
  final CaptureController controller;
  final QueueItem? item;
  const CaptureEditor({super.key, required this.controller, this.item});
  @override
  State<CaptureEditor> createState() => _CaptureEditorState();
}

class _CaptureEditorState extends State<CaptureEditor> {
  late final String id;
  late final TextEditingController date, quantity;
  late String parcel, unit;
  late final int generation;
  bool saved = false, busy = false, confirmed = false;
  String? notice;
  @override
  void initState() {
    super.initState();
    generation = widget.controller.session.generation;
    id = widget.item?.id ?? newCaptureId();
    final f = widget.item?.fields;
    parcel = (f?['parcelId'] as String?) ?? '';
    unit = (f?['unit'] as String?) ?? 'kg';
    date = TextEditingController(
      text:
          (f?['harvestedAt'] as String?) ??
          DateTime.fromMillisecondsSinceEpoch(
            DateTime.now().millisecondsSinceEpoch,
            isUtc: true,
          ).toIso8601String(),
    );
    quantity = TextEditingController(text: (f?['quantity'] as String?) ?? '');
    saved = widget.item != null;
    confirmed = widget.item != null && widget.item!.state != 'draft';
    widget.controller.session.addListener(changedOwner);
  }

  void changedOwner() {
    if (widget.controller.session.generation != generation && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  void dispose() {
    widget.controller.session.removeListener(changedOwner);
    date.dispose();
    quantity.dispose();
    super.dispose();
  }

  Future<void> perform(bool confirm) async {
    setState(() => busy = true);
    try {
      if (widget.controller.session.generation != generation) {
        throw const SessionFailure(Failure.staleGeneration);
      }
      await widget.controller.save(id, {
        'parcelId': parcel,
        'harvestedAt': date.text,
        'quantity': quantity.text,
        'unit': unit,
      });
      saved = true;
      if (confirm) {
        await widget.controller.confirm(id);
        confirmed = true;
        notice = 'Confirmado en este dispositivo; pendiente de aceptación del servidor.';
      } else {
        notice = 'Borrador guardado. Identidad conservada.';
      }
    } catch (error) {
      notice = error is SessionFailure && error.kind == Failure.needsLogin
          ? 'Debes revalidar online el perfil y catálogo para confirmar.'
          : 'No se confirmó. Revisa parcela, cantidad positiva (hasta 9 enteros y 3 decimales con punto), unidad y fecha con zona no futura. El borrador conserva el texto.';
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Captura')),
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SelectableText('ID: $id'),
            if (notice != null) Text(notice!, key: const Key('editor-notice')),
            if (confirmed)
              const Text('Contenido congelado; no se puede editar.'),
            DropdownButtonFormField<String>(
              initialValue: parcel.isEmpty ? null : parcel,
              decoration: const InputDecoration(labelText: 'Parcela asignada'),
              items: [
                for (final p in widget.controller.parcels)
                  DropdownMenuItem(
                    value: p['id'] as String,
                    child: Text(p['name'] as String),
                  ),
                if (parcel.isNotEmpty &&
                    !widget.controller.parcels.any((p) => p['id'] == parcel))
                  DropdownMenuItem(
                    value: parcel,
                    child: const Text(
                      'Parcela guardada sin autorización vigente',
                    ),
                  ),
              ],
              onChanged: confirmed
                  ? null
                  : (v) => setState(() => parcel = v ?? ''),
            ),
            TextField(
              controller: date,
              readOnly: confirmed,
              decoration: const InputDecoration(
                labelText: 'Fecha/hora de cosecha con zona',
                helperText: 'ISO 8601: Z (UTC) o desplazamiento, p. ej. -05:00. No se corrige automáticamente.',
              ),
            ),
            TextField(
              controller: quantity,
              readOnly: confirmed,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Cantidad',
                helperText:
                    'Punto decimal, hasta 3 decimales. Sin conversiones.',
              ),
            ),
            DropdownButtonFormField<String>(
              initialValue: unit,
              decoration: const InputDecoration(labelText: 'Unidad'),
              items: [
                for (final u in ['kg', 'unidad'])
                  DropdownMenuItem(value: u, child: Text(u)),
              ],
              onChanged: confirmed ? null : (v) => setState(() => unit = v!),
            ),
            if (busy) const LinearProgressIndicator(),
            if (!confirmed) ...[
              FilledButton(
                onPressed: busy ? null : () => perform(false),
                child: const Text('Guardar borrador'),
              ),
              OutlinedButton(
                onPressed: busy ? null : () => perform(true),
                child: const Text('Confirmar localmente'),
              ),
            ],
            if (saved)
              const Text(
                'Guardar/confirmar localmente no acredita recepción del servidor.',
              ),
          ],
        ),
      ),
    ),
  );
}
