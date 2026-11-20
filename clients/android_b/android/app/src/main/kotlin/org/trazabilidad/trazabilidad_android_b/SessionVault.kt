package org.trazabilidad.trazabilidad_android_b

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** One encrypted record outside SQLite and Android backup. All calls are
 * serialized by the channel's executor. A failed read never resets storage. */
class SessionVault(context: Context) {
    private val file = AtomicFile(File(context.noBackupFilesDir, "session-v1.bin"))
    private val alias = "org.trazabilidad.session.v1"
    private fun key(create: Boolean): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = store.getKey(alias, null)
        if (existing is SecretKey) return existing
        check(create) { "Missing key" }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true).build())
        }.generateKey()
    }
    fun read(): String? {
        // AtomicFile also recovers a pending backup/new file after interruption.
        if (!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists()) return null
        val bytes = file.openRead().use { input ->
            check(input.channel.size() <= 16384)
            input.readBytes()
        }
        if (bytes.contentEquals(byteArrayOf(0))) return null // durable logout tombstone
        check(bytes.size in 30..16384 && bytes[0] == 1.toByte())
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(false), GCMParameterSpec(128, bytes.copyOfRange(1, 13)))
        cipher.updateAAD(alias.toByteArray(Charsets.UTF_8))
        return cipher.doFinal(bytes.copyOfRange(13, bytes.size)).toString(Charsets.UTF_8)
    }
    fun write(value: String) {
        val plaintext = value.toByteArray(Charsets.UTF_8)
        require(plaintext.size in 1..8192)
        try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key(true))
            check(cipher.iv.size == 12)
            cipher.updateAAD(alias.toByteArray(Charsets.UTF_8))
            replace(byteArrayOf(1) + cipher.iv + cipher.doFinal(plaintext))
        } finally { plaintext.fill(0) }
    }
    fun clear() { replace(byteArrayOf(0)) }
    private fun replace(bytes: ByteArray) {
        val output = file.startWrite()
        try {
            output.write(bytes)
            output.fd.sync() // propagate a flush failure instead of reporting success
            file.finishWrite(output)
        } catch (error: Exception) { file.failWrite(output); throw error }
    }
}
