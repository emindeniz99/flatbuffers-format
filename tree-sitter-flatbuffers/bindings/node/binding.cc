#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_flatbuffers();

// The tag is NOT optional, despite reading like a nicety: the runtime's
// UnwrapLanguage does `arg.IsExternal() && arg.CheckTypeTag(&LANGUAGE_TYPE_TAG)`
// (tree-sitter/src/language.cc) and rejects an untagged External with
// "Invalid language object". Without this, `parser.setLanguage()` throws
// for every consumer of the published package.
//
// The constant is tree-sitter's own, defined in that same file; it is a
// fixed protocol value shared by every grammar binding, not something we
// choose. Keep it byte-for-byte identical.
static const napi_type_tag LANGUAGE_TYPE_TAG = {
    0x8AF2E5212AD58ABF, 0xD5006CAD83ABBA16};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "flatbuffers");
    auto language = Napi::External<TSLanguage>::New(env, tree_sitter_flatbuffers());
    language.TypeTag(&LANGUAGE_TYPE_TAG);
    exports["language"] = language;
    return exports;
}

NODE_API_MODULE(tree_sitter_flatbuffers_binding, Init)
