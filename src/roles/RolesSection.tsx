import { useEffect, useId, useMemo, useState } from 'react'
import { ROLES } from './definitions'
import {
  categoriesInOrder,
  categoryLabel,
  groupRolesByCategory,
} from './groupByCategory'
import { loadRoleCounts, saveRoleCounts } from './storage'
import type { RoleCounts, RoleDefinition } from './types'
import './RolesSection.css'

function RoleDescriptionDialog({
  role,
  onClose,
}: {
  role: RoleDefinition
  onClose: () => void
}) {
  const titleId = useId()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="role-desc-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="role-desc-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="role-desc-header">
          <h3 id={titleId} className="role-desc-title">
            {role.name}
          </h3>
          <button
            type="button"
            className="role-desc-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <p className="role-desc-body">{role.description}</p>
      </div>
    </div>
  )
}

export function RolesSection() {
  const [counts, setCounts] = useState<RoleCounts>(loadRoleCounts)
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)

  useEffect(() => {
    saveRoleCounts(counts)
  }, [counts])

  const grouped = useMemo(
    () => groupRolesByCategory(ROLES),
    [],
  )
  const categoryOrder = useMemo(() => categoriesInOrder(ROLES), [])

  const openRole = useMemo(
    () => (openRoleId ? ROLES.find((r) => r.id === openRoleId) : null),
    [openRoleId],
  )

  function setCount(roleId: string, next: number) {
    const value = Math.max(0, Math.floor(next))
    setCounts((prev) => ({ ...prev, [roleId]: value }))
  }

  return (
    <section className="roles-section" aria-labelledby="roles-heading">
      {openRole && (
        <RoleDescriptionDialog
          role={openRole}
          onClose={() => setOpenRoleId(null)}
        />
      )}

      <h2 id="roles-heading" className="roles-heading">
        Select roles
      </h2>

      <div className="roles-menu">
        {categoryOrder.map((category) => {
          const roles = grouped.get(category)
          if (!roles?.length) return null
          return (
            <div key={category} className="roles-category">
              <h3 className="roles-category-title">{categoryLabel(category)}</h3>
              <ul className="roles-list">
                {roles.map((role) => (
                  <li key={role.id} className="roles-row">
                    <button
                      type="button"
                      className="roles-name-btn"
                      onClick={() => setOpenRoleId(role.id)}
                      aria-haspopup="dialog"
                      aria-expanded={openRoleId === role.id}
                    >
                      {role.name}
                    </button>
                    <div className="roles-stepper" role="group" aria-label={`Count for ${role.name}`}>
                      <button
                        type="button"
                        className="roles-stepper-btn"
                        onClick={() =>
                          setCount(role.id, (counts[role.id] ?? 0) - 1)
                        }
                        aria-label={`Decrease ${role.name}`}
                      >
                        -
                      </button>
                      <span className="roles-count" aria-live="polite">
                        {counts[role.id] ?? 0}
                      </span>
                      <button
                        type="button"
                        className="roles-stepper-btn"
                        onClick={() =>
                          setCount(role.id, (counts[role.id] ?? 0) + 1)
                        }
                        aria-label={`Increase ${role.name}`}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
