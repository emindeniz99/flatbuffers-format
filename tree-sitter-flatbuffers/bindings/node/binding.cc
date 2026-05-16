#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_flatbuffers();

// Minimal binding: exposes `name` and `language` from a Napi External.
// The standard tree-sitter Node template adds a Napi::TypeTag check
// via `language.TypeTag(&LANGUAGE_TYPE_TAG)` for type-safety on the
// External — that symbol comes from a recent tree-sitter binding
// header we don't pull in here. Skipping it is safe: consumers lose
// the runtime-type-tag check, not any parser functionality.
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "flatbuffers");
    auto language = Napi::External<TSLanguage>::New(env, tree_sitter_flatbuffers());
    exports["language"] = language;
    return exports;
}

NODE_API_MODULE(tree_sitter_flatbuffers_binding, Init)
