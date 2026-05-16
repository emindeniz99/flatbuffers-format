#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_flatbuffers();

// "tree-sitter", "language" hashed with BLAKE2 — these constants come
// straight from the standard tree-sitter Node binding template
// (cf. tree-sitter-json, tree-sitter-javascript, etc.).
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "flatbuffers");
    auto language = Napi::External<TSLanguage>::New(env, tree_sitter_flatbuffers());
    language.TypeTag(&LANGUAGE_TYPE_TAG);
    exports["language"] = language;
    return exports;
}

NODE_API_MODULE(tree_sitter_flatbuffers_binding, Init)
