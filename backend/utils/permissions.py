"""
Sistema de permisos basado en roles para ChurchApp
"""
from typing import Dict, List, Set
from enum import Enum

class Permission(str, Enum):
    """Enum con todos los permisos disponibles en el sistema"""
    # Dashboard
    VIEW_DASHBOARD = "view_dashboard"
    
    # Miembros
    VIEW_MIEMBROS = "view_miembros"
    CREATE_MIEMBROS = "create_miembros"
    EDIT_MIEMBROS = "edit_miembros"
    DELETE_MIEMBROS = "delete_miembros"
    
    # Grupos
    VIEW_GRUPOS = "view_grupos"
    CREATE_GRUPOS = "create_grupos"
    EDIT_GRUPOS = "edit_grupos"
    DELETE_GRUPOS = "delete_grupos"
    
    # Observaciones
    VIEW_OBSERVACIONES = "view_observaciones"
    CREATE_OBSERVACIONES = "create_observaciones"
    EDIT_OBSERVACIONES = "edit_observaciones"
    DELETE_OBSERVACIONES = "delete_observaciones"
    
    # POS/Restaurante - Gestión
    VIEW_POS = "view_pos"
    MANAGE_PRODUCTS = "manage_products"
    MANAGE_CATEGORIES = "manage_categories"
    EDIT_PRICES = "edit_prices"
    VIEW_INVENTORY = "view_inventory"
    MANAGE_INVENTORY = "manage_inventory"
    
    # POS - Operaciones
    CREATE_SALES = "create_sales"
    VIEW_SALES = "view_sales"
    CANCEL_SALES = "cancel_sales"
    VIEW_MEMBER_ACCOUNTS = "view_member_accounts"
    MANAGE_PAYMENTS = "manage_payments"
    
    # POS - Caja
    OPEN_SHIFT = "open_shift"
    CLOSE_SHIFT = "close_shift"
    VIEW_SHIFT_SUMMARY = "view_shift_summary"
    
    # POS - Reportes
    VIEW_SALES_REPORTS = "view_sales_reports"
    VIEW_INVENTORY_REPORTS = "view_inventory_reports"
    VIEW_ACCOUNTS_REPORTS = "view_accounts_reports"
    
    # Administración
    MANAGE_USERS = "manage_users"
    MANAGE_INVITES = "manage_invites"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    MANAGE_TEMP_USERS = "manage_temp_users"

class Role(str, Enum):
    """Roles disponibles en el sistema"""
    ADMIN = "admin"
    PASTOR = "pastor"
    SECRETARIA = "secretaria"
    AGENTE_RESTAURANTE = "agente_restaurante"
    AYUDANTE_RESTAURANTE = "ayudante_restaurante"
    TI = "ti"  # Rol técnico especial

# Mapeo de roles a permisos
ROLE_PERMISSIONS: Dict[str, Set[Permission]] = {
    # Admin: Acceso completo a todo
    Role.ADMIN: {
        Permission.VIEW_DASHBOARD,
        # Miembros
        Permission.VIEW_MIEMBROS,
        Permission.CREATE_MIEMBROS,
        Permission.EDIT_MIEMBROS,
        Permission.DELETE_MIEMBROS,
        # Grupos
        Permission.VIEW_GRUPOS,
        Permission.CREATE_GRUPOS,
        Permission.EDIT_GRUPOS,
        Permission.DELETE_GRUPOS,
        # Observaciones
        Permission.VIEW_OBSERVACIONES,
        Permission.CREATE_OBSERVACIONES,
        Permission.EDIT_OBSERVACIONES,
        Permission.DELETE_OBSERVACIONES,
        # POS completo
        Permission.VIEW_POS,
        Permission.MANAGE_PRODUCTS,
        Permission.MANAGE_CATEGORIES,
        Permission.EDIT_PRICES,
        Permission.VIEW_INVENTORY,
        Permission.MANAGE_INVENTORY,
        Permission.CREATE_SALES,
        Permission.VIEW_SALES,
        Permission.CANCEL_SALES,
        Permission.VIEW_MEMBER_ACCOUNTS,
        Permission.MANAGE_PAYMENTS,
        Permission.OPEN_SHIFT,
        Permission.CLOSE_SHIFT,
        Permission.VIEW_SHIFT_SUMMARY,
        Permission.VIEW_SALES_REPORTS,
        Permission.VIEW_INVENTORY_REPORTS,
        Permission.VIEW_ACCOUNTS_REPORTS,
        # Administración
        Permission.MANAGE_USERS,
        Permission.MANAGE_INVITES,
        Permission.VIEW_AUDIT_LOGS,
        Permission.MANAGE_TEMP_USERS,
    },
    
    # Pastor: Gestión completa de miembros, grupos, observaciones
    Role.PASTOR: {
        Permission.VIEW_DASHBOARD,
        # Miembros
        Permission.VIEW_MIEMBROS,
        Permission.CREATE_MIEMBROS,
        Permission.EDIT_MIEMBROS,
        Permission.DELETE_MIEMBROS,
        # Grupos
        Permission.VIEW_GRUPOS,
        Permission.CREATE_GRUPOS,
        Permission.EDIT_GRUPOS,
        Permission.DELETE_GRUPOS,
        # Observaciones
        Permission.VIEW_OBSERVACIONES,
        Permission.CREATE_OBSERVACIONES,
        Permission.EDIT_OBSERVACIONES,
        Permission.DELETE_OBSERVACIONES,
    },
    
    # Secretaria: Gestión completa de miembros, grupos, observaciones
    Role.SECRETARIA: {
        Permission.VIEW_DASHBOARD,
        # Miembros
        Permission.VIEW_MIEMBROS,
        Permission.CREATE_MIEMBROS,
        Permission.EDIT_MIEMBROS,
        Permission.DELETE_MIEMBROS,
        # Grupos
        Permission.VIEW_GRUPOS,
        Permission.CREATE_GRUPOS,
        Permission.EDIT_GRUPOS,
        Permission.DELETE_GRUPOS,
        # Observaciones
        Permission.VIEW_OBSERVACIONES,
        Permission.CREATE_OBSERVACIONES,
        Permission.EDIT_OBSERVACIONES,
        Permission.DELETE_OBSERVACIONES,
    },
    
    # Agente Restaurante: Acceso completo al POS, puede administrar todo
    Role.AGENTE_RESTAURANTE: {
        Permission.VIEW_DASHBOARD,
        # POS completo
        Permission.VIEW_POS,
        Permission.MANAGE_PRODUCTS,
        Permission.MANAGE_CATEGORIES,
        Permission.EDIT_PRICES,
        Permission.VIEW_INVENTORY,
        Permission.MANAGE_INVENTORY,
        Permission.CREATE_SALES,
        Permission.VIEW_SALES,
        Permission.CANCEL_SALES,
        Permission.VIEW_MEMBER_ACCOUNTS,
        Permission.MANAGE_PAYMENTS,
        Permission.OPEN_SHIFT,
        Permission.CLOSE_SHIFT,
        Permission.VIEW_SHIFT_SUMMARY,
        Permission.VIEW_SALES_REPORTS,
        Permission.VIEW_INVENTORY_REPORTS,
        Permission.VIEW_ACCOUNTS_REPORTS,
        Permission.MANAGE_TEMP_USERS,
    },
    
    # Ayudante Restaurante: Operaciones básicas del POS (temporal)
    Role.AYUDANTE_RESTAURANTE: {
        # Solo operaciones básicas
        Permission.VIEW_POS,
        Permission.CREATE_SALES,
        Permission.VIEW_SALES,
        Permission.VIEW_MEMBER_ACCOUNTS,
        Permission.VIEW_INVENTORY,
    },
    
    # TI: Mismo que admin (para soporte técnico)
    Role.TI: {
        Permission.VIEW_DASHBOARD,
        # Miembros
        Permission.VIEW_MIEMBROS,
        Permission.CREATE_MIEMBROS,
        Permission.EDIT_MIEMBROS,
        Permission.DELETE_MIEMBROS,
        # Grupos
        Permission.VIEW_GRUPOS,
        Permission.CREATE_GRUPOS,
        Permission.EDIT_GRUPOS,
        Permission.DELETE_GRUPOS,
        # Observaciones
        Permission.VIEW_OBSERVACIONES,
        Permission.CREATE_OBSERVACIONES,
        Permission.EDIT_OBSERVACIONES,
        Permission.DELETE_OBSERVACIONES,
        # POS completo
        Permission.VIEW_POS,
        Permission.MANAGE_PRODUCTS,
        Permission.MANAGE_CATEGORIES,
        Permission.EDIT_PRICES,
        Permission.VIEW_INVENTORY,
        Permission.MANAGE_INVENTORY,
        Permission.CREATE_SALES,
        Permission.VIEW_SALES,
        Permission.CANCEL_SALES,
        Permission.VIEW_MEMBER_ACCOUNTS,
        Permission.MANAGE_PAYMENTS,
        Permission.OPEN_SHIFT,
        Permission.CLOSE_SHIFT,
        Permission.VIEW_SHIFT_SUMMARY,
        Permission.VIEW_SALES_REPORTS,
        Permission.VIEW_INVENTORY_REPORTS,
        Permission.VIEW_ACCOUNTS_REPORTS,
        # Administración
        Permission.MANAGE_USERS,
        Permission.MANAGE_INVITES,
        Permission.VIEW_AUDIT_LOGS,
        Permission.MANAGE_TEMP_USERS,
    },
}

def get_role_permissions(role: str) -> Set[Permission]:
    """Obtiene los permisos de un rol específico"""
    return ROLE_PERMISSIONS.get(role, set())

def has_permission(role: str, permission: Permission) -> bool:
    """Verifica si un rol tiene un permiso específico"""
    role_perms = get_role_permissions(role)
    return permission in role_perms

def has_any_permission(role: str, permissions: List[Permission]) -> bool:
    """Verifica si un rol tiene al menos uno de los permisos especificados"""
    role_perms = get_role_permissions(role)
    return any(perm in role_perms for perm in permissions)

def has_all_permissions(role: str, permissions: List[Permission]) -> bool:
    """Verifica si un rol tiene todos los permisos especificados"""
    role_perms = get_role_permissions(role)
    return all(perm in role_perms for perm in permissions)

def can_access_section(role: str, section: str) -> bool:
    """
    Verifica si un rol puede acceder a una sección específica de la app
    
    Secciones:
    - dashboard: Dashboard principal
    - miembros: Gestión de miembros
    - grupos: Gestión de grupos
    - pos: Módulo POS/Restaurante
    - admin: Administración del sistema
    """
    section_permissions = {
        "dashboard": [Permission.VIEW_DASHBOARD],
        "miembros": [Permission.VIEW_MIEMBROS],
        "grupos": [Permission.VIEW_GRUPOS],
        "pos": [Permission.VIEW_POS],
        "admin": [Permission.MANAGE_USERS, Permission.MANAGE_INVITES],
    }
    
    required_perms = section_permissions.get(section, [])
    return has_any_permission(role, required_perms)
