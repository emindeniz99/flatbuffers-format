package io.github.emindeniz99.intellij

import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.components.Service
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import java.util.EnumSet

/**
 * Remembers which degradations have already been reported.
 *
 * Formatting resolves the engine on *every* request, and format-on-save
 * means that can be several times a minute. Without this, a machine
 * with an old Node would get a balloon per save — which is how users
 * learn to ignore balloons. One per kind per project session: the
 * second identical resolution is silent.
 *
 * Split out of the service so it can be tested without an IDE.
 */
class EngineIssueDedup {
    private val reported = EnumSet.noneOf(EngineIssue.Kind::class.java)

    /** True exactly once per [kind]. */
    @Synchronized
    fun firstTime(kind: EngineIssue.Kind): Boolean = reported.add(kind)
}

/**
 * Turns an [EngineIssue] into a balloon in the plugin's own
 * "FlatBuffers" notification group (declared in plugin.xml, and the
 * same group id [FlatBuffersFormattingService] reports errors through).
 *
 * Every notification carries the action that actually fixes it, because
 * the message alone ("no Node found") leaves the user guessing which of
 * three remedies applies to them.
 */
@Service(Service.Level.PROJECT)
class EngineNotifications(private val project: Project) {

    private val dedup = EngineIssueDedup()

    fun notifyOnce(issue: EngineIssue) {
        if (!dedup.firstTime(issue.kind)) return

        val notification = NotificationGroupManager.getInstance()
            .getNotificationGroup(FlatBuffersFormattingService.NOTIFICATION_GROUP)
            .createNotification(issue.title, issue.message, NotificationType.WARNING)

        notification.addAction(
            NotificationAction.createSimple("Open FlatBuffers settings") {
                ShowSettingsUtil.getInstance().showSettingsDialog(project, FlatBuffersConfigurable::class.java)
            },
        )
        // Only offer the download when it would change anything: it is a
        // ~30 MiB fetch, and it is already the engine we fell back to
        // when the cache is populated.
        if (BundledEngine.platformAsset() != null && !BundledEngine.isCached()) {
            notification.addAction(
                // Expiring: the balloon's advice is stale the moment the
                // download starts.
                NotificationAction.createSimpleExpiring("Download native engine") { downloadEngine() },
            )
        }
        notification.notify(project)
    }

    private fun downloadEngine() {
        object : Task.Backgroundable(project, "Downloading flatbuffers-format engine", true) {
            override fun run(indicator: ProgressIndicator) {
                val group = NotificationGroupManager.getInstance()
                    .getNotificationGroup(FlatBuffersFormattingService.NOTIFICATION_GROUP)
                try {
                    val path = BundledEngine.ensureDownloaded(indicator)
                    group.createNotification(
                        "FlatBuffers engine downloaded",
                        "flatbuffers-format ${BundledEngine.ENGINE_VERSION} is ready at $path.",
                        NotificationType.INFORMATION,
                    ).notify(project)
                } catch (e: BundledEngine.BundledEngineException) {
                    group.createNotification(
                        "FlatBuffers engine download failed",
                        e.message ?: "Unknown download failure.",
                        NotificationType.ERROR,
                    ).notify(project)
                }
            }
        }.queue()
    }

    companion object {
        fun getInstance(project: Project): EngineNotifications =
            project.getService(EngineNotifications::class.java)
    }
}
