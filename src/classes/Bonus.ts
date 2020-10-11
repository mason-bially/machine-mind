import { Mech, Pilot } from '@/class'
import dict from '@/assets/bonus_dictionary.json'
import { DamageType, RangeType, WeaponSize, WeaponType } from './enums'

interface IBonusData {
  id: string
  val: string | number
  damage_types?: DamageType[]
  range_types?: RangeType[]
  weapon_types?: WeaponType[]
  weapon_sizes?: WeaponSize[]
}

class Bonus {
  public readonly ID: string
  public readonly Value: string | number
  public readonly Title: string | number
  public readonly Detail: string | number
  public readonly DamageTypes: DamageType[]
  public readonly RangeTypes: RangeType[]
  public readonly WeaponTypes: WeaponType[]
  public readonly WeaponSizes: WeaponSize[]

  public constructor(data: IBonusData) {
    const entry = dict.find(x => x.id === data.id)
    this.ID = data.id
    this.Value = data.val
    this.DamageTypes = data.damage_types || []
    this.RangeTypes = data.range_types || []
    this.WeaponTypes = data.weapon_types || []
    this.WeaponSizes = data.weapon_sizes || []
    this.Title = entry ? entry.title : 'UNKNOWN BONUS'
    this.Detail = entry ? this.parseDetail(entry.detail) : 'UNKNOWN BONUS'
  }

  private parseDetail(detail): string {
    let str = detail.slice()
    str = str.replace(/{VAL}/g, this.Value)
    str = str.replace(/{INC_DEC}/g, this.Value > -1 ? 'Increases' : 'Decreases')
    str = str.replace(
      /{RANGE_TYPES}/g,
      ` ${this.RangeTypes.length ? this.RangeTypes.join('/').toUpperCase() : ''}`
    )
    str = str.replace(
      /{DAMAGE_TYPES}/g,
      ` ${this.DamageTypes.length ? this.DamageTypes.join('/').toUpperCase() : ''}`
    )
    str = str.replace(
      /{WEAPON_TYPES}/g,
      ` ${this.WeaponTypes.length ? this.WeaponTypes.join('/').toUpperCase() : ''}`
    )
    str = str.replace(
      /{WEAPON_SIZES}/g,
      ` ${this.WeaponSizes.length ? this.WeaponSizes.join('/').toUpperCase() : ''}`
    )

    return str
  }

  public static Evaluate(bonus: Bonus, pilot: Pilot): number {
    if (typeof bonus.Value === 'number') return Math.ceil(bonus.Value)
    let valStr = bonus.Value
    valStr = valStr.replaceAll(`{ll}`, pilot.Level.toString())
    valStr = valStr.replaceAll(`{grit}`, pilot.Grit.toString())
    valStr = valStr.replace(/[^-()\d/*+.]/g, '')
    return Math.ceil(eval(valStr))
  }

  public static get(id: string, mech: Mech): number {
    return mech.Bonuses.filter(x => x.ID === id).reduce(
      (sum, bonus) => sum + this.Evaluate(bonus, mech.Pilot),
      0
    )
  }

  public static getPilot(id: string, pilot: Pilot): number {
    return pilot.Bonuses.filter(x => x.ID === id).reduce(
      (sum, bonus) => sum + this.Evaluate(bonus, pilot),
      0
    )
  }

  private static MechContributors(m: Mech, id: string): { name: string; val: number }[] {
    const output = []
    if (m.ActiveLoadout && m.ActiveLoadout.Equipment) {
      m.ActiveLoadout.Equipment.filter(x => x && !x.Destroyed && !x.IsCascading).forEach(e => {
        e.Bonuses.forEach(b => {
          if (b.ID === id)
            output.push({
              name: `${e.Source} ${e.Name} (${m.ActiveLoadout.Name} Loadout)`,
              val: Bonus.Evaluate(b, m.Pilot),
            })
        })
      })
    }

    m.Frame.Traits.forEach(t => {
      t.Bonuses.forEach(b => {
        if (b.ID === id)
          output.push({
            name: `${t.Name} (${m.Frame.Source} ${m.Frame.Name} Trait)`,
            val: Bonus.Evaluate(b, m.Pilot),
          })
      })
    })

    m.Frame.CoreSystem.PassiveBonuses.forEach(b => {
      if (b.ID === id)
        output.push({
          name: `${m.Frame.CoreSystem.PassiveName} (${m.Frame.Source} ${m.Frame.Name} CORE System Passive)`,
          val: Bonus.Evaluate(b, m.Pilot),
        })
    })

    if (m.CoreActive) {
      m.Frame.CoreSystem.ActiveBonuses.forEach(b => {
        if (b.ID === id)
          output.push({
            name: `${m.Frame.CoreSystem.ActiveName} (${m.Frame.Source} ${m.Frame.Name} CORE System Active)`,
            val: Bonus.Evaluate(b, m.Pilot),
          })
      })
    }
    return output
  }

  public static Contributors(id: string, m: Mech): { name: string; val: number }[] {
    const output = Bonus.MechContributors(m, id)
    m.Pilot.Loadout.Items.forEach(i => {
      i.Bonuses.forEach(b => {
        if (b.ID === id)
          output.push({
            name: `${i.Name} (Pilot Equipment)`,
            val: Bonus.Evaluate(b, m.Pilot),
          })
      })
    })

    m.Pilot.CoreBonuses.forEach(cb => {
      cb.Bonuses.forEach(b => {
        if (b.ID === id)
          output.push({
            name: `${cb.Name} (${cb.Source} CORE Bonus)`,
            val: Bonus.Evaluate(b, m.Pilot),
          })
      })
    })

    m.Pilot.Reserves.forEach(r => {
      r.Bonuses.forEach(b => {
        if (b.ID === id && !r.Used)
          output.push({
            name: `${r.Name} (Reserve)`,
            val: Bonus.Evaluate(b, m.Pilot),
          })
      })
    })

    m.Pilot.Talents.flatMap(x => x.UnlockedRanks).forEach(t => {
      t.Bonuses.forEach(b => {
        if (b.ID === id)
          output.push({
            name: `${t.Name} (Pilot Talent)`,
            val: Bonus.Evaluate(b, m.Pilot),
          })
      })
    })
    return output
  }
}

export { Bonus, IBonusData }




















export enum BonusType {
          SkillPoint = "skill_point",   // integer
          MechSkillPoint = "mech_skill_point"  , // integer
          TalentPoint = "talent_point"  , // integer
          LicensePoint = "license_point" , // integer
          CoreBonusPoint = "cb_point" , // integer

          Range = "range" , // integer
          Threat = "threat" , // integer
          Damage = "damage" , // integer


          HP = "hp" , // integer
          Armor = "armor" , // integer
          Structure = "structure" , // integer
          Stress = "stress" , // integer
          Heatcap = "heatcap" , // integer
          Repcap = "repcap" , // integer
          CorePower = "core_power" , // integer
          Speed = "speed" , // integer
          Evasion = "evasion" , // integer
          EDef = "edef" , // integer
          Sensor = "sensor" , // integer

          Attack = "attack" , // integer
          TechAttack = "tech_attack" , // integer

          Grapple ="grapple", // integer
          Ram ="ram", // integer
          Save = "save" , // integer
          SP = "sp" , // integer
          Size = "size" , // integer
          AICap = "ai_cap" , // integer
          CheapStruct = "cheap_struct" , // boolean
          CheapStress = "cheap_stress" , // boolean
          Overcharge = "overcharge" , //Overcharge Track 	DieRoll[] as string[]
          LimitedBonus = "limited_bonus" , // integer
          PilotHP = "pilot_hp" , // integer
          PilotArmor = "pilot_armor" , // integer
          PilotEvasion = "pilot_evasion" , // integer
          PilotEDef = "pilot_edef" , // integer
          PilotSpeed = "pilot_speed" , // integer

          PilotGearCap = "pilot_gear_cap" , // integer
          PilotWeaponCap = "pilot_weapon_cap" , // integer


          DeployableHP = "deployable_hp" , // integer
          DeployableSize = "deployable_size" , // integer
          DeployableCharges = "deployable_charges" , // integer
          DeployableArmor = "deployable_armor" , // integer
          DeployableEvasion = "deployable_evasion" , // integer
          DeployableEDef = "deployable_edef" , // integer
          DeployableHeatCap = "deployable_heatcap" , // integer
          DeployableRepairCap = "deployable_repcap" , // integer
          DeployableSensorRange = "deployable_sensor_range" , // integer
          DeployableTechAttack = "deployable_tech_attack" , // integer
          DeployableSave = "deployable_save" , // integer 
          DeployableSpeed = "deployable_speed", //
          Placeholder = "placeholder",
          Unrecognized = "unrecognized",
}

export function Evaluate(bonus: Bonus, pilot: Pilot): number{
    if (typeof bonus.Value === 'number') return Math.ceil(bonus.Value)
    let valStr = bonus.Value
    valStr = valStr.replaceAll(`{ll}`, pilot.Level.toString())
    valStr = valStr.replaceAll(`{grit}`, pilot.Grit.toString())

    return Math.ceil(pmath.parse(valStr));
}  // integer