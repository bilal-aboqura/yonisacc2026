/**
 * Shared utility for building account trees with code-prefix fallback.
 * When an account has no parent_id, it tries to find a parent by matching
 * the longest code prefix (e.g., code "1131" → parent code "113").
 */

/**
 * Attach orphaned nodes to their correct parent using code-prefix matching.
 * Works with any node type that has id, code, and children.
 * 
 * @param getCode - function to extract code from a node
 * @param getChildren - function to get/set children array on a node
 */
export function attachOrphansByCodePrefix<T extends { id: string; children?: any[] }>(
  byId: Map<string, T>,
  roots: T[],
  getCode?: (node: T) => string
): T[] {
  const codeFn = getCode || ((node: any) => node.code || node.account?.code || "");

  // Build a code→node map for prefix lookup
  const byCode = new Map<string, T>();
  byId.forEach((node) => byCode.set(codeFn(node), node));

  const realRoots: T[] = [];
  const orphans: T[] = [];

  for (const node of roots) {
    const code = codeFn(node);
    if (code.length <= 1) {
      realRoots.push(node);
    } else {
      orphans.push(node);
    }
  }

  for (const orphan of orphans) {
    let attached = false;
    const code = codeFn(orphan);
    for (let len = code.length - 1; len >= 1; len--) {
      const prefix = code.substring(0, len);
      const potentialParent = byCode.get(prefix);
      if (potentialParent && potentialParent.id !== orphan.id) {
        potentialParent.children = potentialParent.children || [];
        if (!potentialParent.children.some((c: any) => c.id === orphan.id)) {
          potentialParent.children.push(orphan);
        }
        attached = true;
        break;
      }
    }
    if (!attached) {
      realRoots.push(orphan);
    }
  }

  return realRoots;
}

/**
 * Sort nodes recursively by code (numeric-aware)
 */
export function sortTreeByCode<T extends { children?: T[] }>(
  nodes: T[],
  getCode?: (node: T) => string
): void {
  const codeFn = getCode || ((node: any) => node.code || node.account?.code || "");
  nodes.sort((a, b) => codeFn(a).localeCompare(codeFn(b), undefined, { numeric: true }));
  nodes.forEach((n) => {
    if (n.children && n.children.length > 0) sortTreeByCode(n.children, getCode);
  });
}
