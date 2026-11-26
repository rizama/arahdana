export async function post(path: string, data: unknown) {
  const csrf = await fetch("/api/csrf");
  if (!csrf.ok) throw new Error("Token belum tersedia. Coba lagi.");
  const { token } = await csrf.json();
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Permintaan belum berhasil.");
  return body;
}
