type ErrorWithDetails = {
  status?: number;
  data?: unknown;
  message?: string;
};

function responseMessage(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const value = (data as { error?: unknown }).error;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getUserFacingError(
  error: unknown,
  fallback = "Não foi possível concluir a operação. Tente novamente.",
) {
  const details = (error ?? {}) as ErrorWithDetails;
  const message = responseMessage(details.data);

  if (details.status === 413) {
    return "A imagem ficou muito grande. Remova o retrato e escolha outra imagem; o sistema a otimiza automaticamente.";
  }
  if (details.status === 401) {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }
  if (details.status === 403) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (details.status === 404) {
    return "O registro não foi encontrado. Atualize a página e tente novamente.";
  }
  if (details.status === 409) {
    return message ?? "Já existe um cadastro com esses dados. Confira as informações.";
  }
  if (details.status === 400) {
    return message ?? "Confira os dados informados e tente novamente.";
  }
  if (message) return message;
  return fallback;
}