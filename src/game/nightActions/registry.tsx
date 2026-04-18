import type { ComponentType } from 'react'
import { FoolNightAction } from './FoolNightAction'
import { SerialKillerKillAction } from './SerialKillerKillAction'
import { TannerNightAction } from './TannerNightAction'
import type { NightActionPanelProps } from './types'
import { VillagerNightAction } from './VillagerNightAction'

const NIGHT_ACTIONS: Record<string, ComponentType<NightActionPanelProps>> = {
  serial_killer: SerialKillerKillAction,
  villager: VillagerNightAction,
  tanner: TannerNightAction,
  fool: FoolNightAction,
}

export function NightActionForRole({
  roleId,
  ...props
}: NightActionPanelProps & { roleId: string }) {
  const Comp = NIGHT_ACTIONS[roleId] ?? VillagerNightAction
  return <Comp {...props} />
}
