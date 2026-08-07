package io.github.emindeniz99.intellij

import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

/**
 * Lazy-loaded SVG icon shown in the Project view next to `.fbs` files
 * and on the Marketplace listing. The path is relative to the resources
 * classpath root, so `/icons/flatbuffers.svg` resolves to
 * `src/main/resources/icons/flatbuffers.svg`.
 */
object FlatBuffersIcons {
    @JvmField
    val FILE: Icon = IconLoader.getIcon("/icons/flatbuffers.svg", FlatBuffersIcons::class.java)
}
