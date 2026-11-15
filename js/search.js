export const searchKey = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export const modelMatches = (model, term) => {
  const name = searchKey(
    `${model.brand || ""} ${model.name} ${model.id || ""}`,
  );
  if (name.includes(searchKey(term))) return true;
  const words =
    String(term)
      .normalize("NFKC")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || [];
  return words.length > 0 && words.every((word) => name.includes(word));
};
