import type { ComponentType } from 'react'
import { SerialKillerKillAction } from './SerialKillerKillAction'
import { TannerNightAction } from './TannerNightAction'
import type { NightActionPanelProps } from './types'
import { VillagerNightAction } from './VillagerNightAction'

const NIGHT_ACTIONS: Record<string, ComponentType<NightActionPanelProps>> = {
  serial_killer: SerialKillerKillAction,
  survivor: VillagerNightAction,
  tanner: TannerNightAction,
}

export function NightActionForRole({
  roleId,
  ...props
}: NightActionPanelProps & { roleId: string }) {
  const Comp = NIGHT_ACTIONS[roleId] ?? VillagerNightAction
  return <Comp {...props} />
}
