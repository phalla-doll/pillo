let idCounter = 0;

export const generateId = () => {
	idCounter += 1;
	if (typeof window === "undefined") return `pillo-${idCounter}`;
	return `pillo-${idCounter}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`;
};
