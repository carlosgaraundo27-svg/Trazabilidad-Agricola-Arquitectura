package org.trazabilidad.trazabilidad_android_b

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    companion object {
        private val processToken = java.util.UUID.randomUUID().toString()
    }
    override fun configureFlutterEngine(engine: FlutterEngine) {
        super.configureFlutterEngine(engine)
        val vault = SessionVault(applicationContext)
        val queue = java.util.concurrent.Executors.newSingleThreadExecutor()
        MethodChannel(engine.dartExecutor.binaryMessenger, "org.trazabilidad/session-vault")
            .setMethodCallHandler { call, result ->
                queue.execute {
                    try {
                        val value: Any? = when (call.method) {
                            "read" -> vault.read()
                            "write" -> { vault.write(call.arguments as String); null }
                            "clear" -> { vault.clear(); null }
                            "clock" -> {
                                val boot = try { android.provider.Settings.Global.getInt(contentResolver, android.provider.Settings.Global.BOOT_COUNT, -1).takeIf { it >= 0 } } catch (_: Exception) { null }
                                mapOf("boot" to boot, "elapsedMs" to android.os.SystemClock.elapsedRealtime(), "process" to processToken)
                            }
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
