import { permissionRepository } from "../repositories/permissionRepository.js";

export const permissionService = {
  listPermissions() {
    return permissionRepository.list();
  }
};
