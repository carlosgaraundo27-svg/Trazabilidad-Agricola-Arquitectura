package org.trazabilidad.trazabilidad_android_b

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(engine: FlutterEngine) {
        super.configureFlutterEngine(engine)
        val vault = SessionVault(applicationContext)
        val queue = java.util.concurrent.Executors.newSingleThreadExecutor()
        MethodChannel(engine.dartExecutor.binaryMessenger, "org.trazabilidad/session-vault")
            .setMethodCallHandler { call, result ->
                queue.execute {
                    try {
                        val value: String? = when (call.method) {
                            "read" -> vault.read()
                            "write" -> { vault.write(call.arguments as String); null }
                            "clear" -> { vault.clear(); null }
                            else -> { runOnUiThread { result.notImplemented() }; return@execute }
                        }
                        runOnUiThread { result.success(value) }
                    } catch (_: Exception) {
                        // Never include credentials, ciphertext or crypto diagnostics in logs/UI.
                        runOnUiThread { result.error("STORAGE_UNAVAILABLE", "Almacen seguro no disponible", null) }
                    }
                }
            }
    }
}
