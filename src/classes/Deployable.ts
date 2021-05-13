import { Action, Bonus, Counter, Mech, Pilot, Synergy, TagInstance } from "@src/class";
import { defaults, lid_format_name } from "@src/funcs";
import {
    RegBonusData,
    PackedBonusData,
    ISynergyData,
    PackedTagInstanceData,
    RegTagInstanceData,
    PackedCounterData,
    RegCounterData,
    PackedActionData,
    RegActionData,
} from "@src/interface";
import {
    EntryType,
    InventoriedRegEntry,
    OpCtx,
    RegEntry,
    Registry,
    RegRef,
    SerUtil,
} from "@src/registry";
import { ActivationType } from "@src/enums";
import { BonusContext } from "./Bonus";
import { Npc } from "./npc/Npc";
import { merge_defaults } from "./default_entries";

export interface PackedDeployableData {
    name: string;
    type: string; // this is for UI furnishing only,
    detail: string;
    activation?: ActivationType;
    deactivation?: ActivationType;
    recall?: ActivationType;
    redeploy?: ActivationType;
    range?: Range[];

    size: number;
    instances?: number;
    cost?: number;
    armor?: number;
    hp?: number;
    evasion?: number;
    edef?: number;
    heatcap?: number;
    repcap?: number;
    pilot?: boolean;
    mech?: boolean;
    sensor_range?: number;
    tech_attack?: number;
    save?: number;
    speed?: number;
    actions?: PackedActionData[];
    bonuses?: PackedBonusData[];
    synergies?: ISynergyData[];
    counters?: PackedCounterData[];
    tags?: PackedTagInstanceData[];
}

export enum DeployableType {
    Deployable = "Deployable",
    Drone = "Drone",
    Mine = "Mine"
}

export interface RegDeployableData {
    lid: string; // Generated by concatenating the deployable name to its source system name
    name: string;
    type: DeployableType; // Controls bonuses that this will receive
    detail: string;
    activation: ActivationType;
    deactivation: ActivationType;
    recall: ActivationType;
    redeploy: ActivationType;
    instances: number;
    size: number;
    cost: number;
    armor: number;
    max_hp: number;
    evasion: number;
    edef: number;
    heatcap: number;
    repcap: number;
    avail_unmounted: boolean;
    avail_mounted: boolean;
    sensor_range: number;
    tech_attack: number;
    save: number; // Mandatory - a 0 means use inherited, or 10 if default
    speed: number;
    actions: RegActionData[];
    bonuses: RegBonusData[]; // Why does this exist, again?
    synergies: ISynergyData[];
    counters: RegCounterData[];
    tags: RegTagInstanceData[];

    overshield: number;
    current_hp: number;
    current_heat: number;
    burn: number;

    deployer: RegRef<EntryType.PILOT | EntryType.MECH | EntryType.NPC> | null;
}

export class Deployable extends InventoriedRegEntry<EntryType.DEPLOYABLE> {
    LID!: string;
    Name!: string;
    DeployableType!: DeployableType; 
    Detail!: string;
    Cost!: number; // The limited cost of deploying this
    Instances!: number; // How many should be created in a single deployment

    // Action Info
    Activation!: ActivationType;
    Deactivation!: ActivationType;
    Recall!: ActivationType;
    Redeploy!: ActivationType;

    // HP and related "curr" state
    CurrentHP!: number;
    CurrentHeat!: number;
    Overshield!: number;
    Burn!: number;
    CurrentRepairs: number = 0; // Todo - what are we doing here

    // Base Stats
    BaseSize!: number;
    BaseArmor!: number;
    BaseMaxHP!: number;
    BaseEvasion!: number;
    BaseEDefense!: number;
    BaseHeatCapacity!: number;
    BaseRepairCapacity!: number; // ????
    BaseSensorRange!: number; // Does this need to be here? Maybe. Can broadly be used to represent it's effective range
    BaseTechAttack!: number;
    BaseSaveTarget!: number;
    BaseSpeed!: number;

    // Availability info.
    AvailableMounted!: boolean;
    AvailableUnmounted!: boolean;

    // The common BASCT
    Actions!: Action[];
    Bonuses!: Bonus[];
    Synergies!: Synergy[];
    Counters!: Counter[];
    Tags!: TagInstance[];

    // Ownership
    Deployer!: Pilot | Mech | Npc | null;

    // All bonuses affecting this mech, from itself, its pilot, and (todo) any status effects
    public get AllBonuses(): Bonus[] {
        // Get bonuses, prefering cached
        if (this.Deployer) {
            if (this.Deployer.Type == EntryType.PILOT || this.Deployer.Type == EntryType.MECH) {
                // Get bonuses just from pilot
                return [...this.Deployer.AllBonuses, ...this.Bonuses];
            }
        }

        // In case of no deployer / deployer is npc, cannot compute any additional bonuses
        return this.Bonuses;
    }

    // Cached version of above. Must be manually invalidated
    private cached_bonuses: Bonus[] | null = null;

    // Makes the cache need re-computation. Since we don't do any work ourselves, this is more about
    // asking our deployer to recompute
    public recompute_bonuses(include_deployer: boolean = true) {
        this.cached_bonuses = null;
        if (this.Deployer && include_deployer) {
            this.Deployer.recompute_bonuses();
        }
    }

    // Sum our pilot bonuses and our intrinsic bonuses for one big honkin bonus for the specified id, return the number
    private sum_typed_bonuses(base_value: number, lid: string): number {
        // Filter down to only relevant bonuses
        let filtered: Bonus[];
        // Are we a drone? Then also include drone_ variants
        if(this.DeployableType === DeployableType.Deployable) {
            let deployable_lid = "deployable_" + lid;
            filtered = this.AllBonuses.filter(b => b.LID == deployable_lid);
        } else if(this.DeployableType === DeployableType.Drone) {
            let drone_lid = "drone_" + lid;
            filtered = this.AllBonuses.filter(b => b.LID == drone_lid);
        } else {
            return 0; // Mines etc receive no bonuses
        }

        let ctx: BonusContext = {};
        if (this.Deployer?.Type == EntryType.PILOT) {
            // Set pilot ctx if directly associated with a pilot
            ctx = Bonus.ContextFor(this.Deployer);
        } else if (this.Deployer?.Type == EntryType.MECH) {
            // If assoc with a mech, need to route through said mech
            if (this.Deployer.Pilot) {
                ctx = Bonus.ContextFor(this.Deployer.Pilot);
            }
        }

        // Use the context to accumulate. If we couldn't find a pilot, values will likely be off, but still useable
        return Bonus.Accumulate(base_value, filtered, ctx).final_value;
    }

    // Derived stats
    get Size(): number {
        return this.sum_typed_bonuses(this.BaseSize, "size");
    }
    get Armor(): number {
        return this.sum_typed_bonuses(this.BaseArmor, "armor");
    }
    get MaxHP(): number {
        return this.sum_typed_bonuses(this.BaseMaxHP, "hp");
    }
    get Evasion(): number {
        return this.sum_typed_bonuses(this.BaseEvasion, "evasion");
    }
    get EDefense(): number {
        return this.sum_typed_bonuses(this.BaseEDefense, "edef");
    }
    get HeatCapacity(): number {
        return this.sum_typed_bonuses(this.BaseHeatCapacity, "heatcap");
    }
    get RepairCapacity(): number {
        return this.sum_typed_bonuses(this.BaseRepairCapacity, "repcap");
    }
    get SensorRange(): number {
        return this.sum_typed_bonuses(this.BaseSize, "sensor_range");
    }
    get TechAttack(): number {
        return this.sum_typed_bonuses(this.BaseTechAttack, "tech_attack");
    }
    get SaveTarget(): number {
        return this.sum_typed_bonuses(this.BaseSaveTarget, "save");
    }
    get Speed(): number {
        return this.sum_typed_bonuses(this.BaseSpeed, "speed");
    }

    // They don't own anything yet, but statuses will maybe change this? or if they have systems? idk, they're actors so it made sense at the time
    protected enumerate_owned_items(): RegEntry<any>[] {
        return [];
    }

     // Get the most probably activation action. Order of priority is Activate -> Redeploy -> Quick Action
    get PrimaryActivation(): ActivationType {
        if (this.Activation && this.Activation !== ActivationType.None) {
            return this.Activation;
        } else if (this.Redeploy && this.Redeploy !== ActivationType.None) {
            return this.Redeploy;
        } else {
            return ActivationType.Quick;
        }
    }

    public async load(data: RegDeployableData): Promise<void> {
        data = merge_defaults(data, defaults.DEPLOYABLE());
        this.AvailableMounted = data.avail_mounted;
        this.AvailableUnmounted = data.avail_unmounted;

        this.LID = data.lid;
        this.Name = data.name;
        this.Detail = data.detail;
        this.DeployableType = data.type;
        this.Cost = data.cost;
        this.Instances = data.instances;

        this.Activation = data.activation;
        this.Recall = data.recall;
        this.Redeploy = data.redeploy;
        this.Deactivation = data.deactivation;

        this.CurrentHP = data.current_hp;
        this.CurrentHeat = data.current_heat;
        this.Overshield = data.overshield;
        this.Burn = data.burn;

        this.BaseSize = data.size;
        this.BaseArmor = data.armor;
        this.BaseMaxHP = data.max_hp;
        this.BaseEvasion = data.evasion;
        this.BaseEDefense = data.edef;
        this.BaseHeatCapacity = data.heatcap;
        this.BaseRepairCapacity = data.repcap;
        this.BaseSaveTarget = data.save;
        this.BaseSpeed = data.speed;
        this.BaseSensorRange = data.sensor_range;
        this.BaseTechAttack = data.tech_attack;

        this.Actions = SerUtil.process_actions(data.actions);
        this.Bonuses = SerUtil.process_bonuses(data.bonuses, this.Name);
        this.Synergies = SerUtil.process_synergies(data.synergies);
        this.Tags = await SerUtil.process_tags(this.Registry, this.OpCtx, data.tags);
        this.Counters = data.counters?.map(x => new Counter(x)) || [];

        this.Deployer = data.deployer
            ? await this.Registry.resolve(this.OpCtx, data.deployer, {wait_ctx_ready: false})
            : null;
    }

    protected save_imp(): RegDeployableData {
        return {
            lid: this.LID,
            name: this.Name,
            type: this.DeployableType,
            burn: this.Burn,
            detail: this.Detail,
            activation: this.Activation,
            deactivation: this.Deactivation,
            recall: this.Recall,
            redeploy: this.Redeploy,
            size: this.BaseSize,
            instances: this.Instances,
            cost: this.Cost,
            armor: this.BaseArmor,
            max_hp: this.BaseMaxHP,
            current_hp: this.CurrentHP,
            overshield: this.Overshield,
            current_heat: this.CurrentHeat,
            evasion: this.BaseEvasion,
            edef: this.BaseEDefense,
            heatcap: this.BaseHeatCapacity,
            repcap: this.BaseRepairCapacity,
            sensor_range: this.BaseSensorRange,
            tech_attack: this.BaseTechAttack,
            save: this.BaseSaveTarget,
            speed: this.BaseSpeed,
            actions: SerUtil.save_all(this.Actions),
            bonuses: SerUtil.save_all(this.Bonuses),
            synergies: SerUtil.save_all(this.Synergies),
            tags: SerUtil.save_all(this.Tags),
            counters: this.Counters.map(c => c.save()),
            avail_mounted: this.AvailableMounted,
            avail_unmounted: this.AvailableUnmounted,
            deployer: this.Deployer?.as_ref() ?? null,
        };
    }

    // Loads this item into the registry. Only use as needed (IE once)
    public static async unpack(
        dep: PackedDeployableData,
        reg: Registry,
        ctx: OpCtx,
        // We need this to generate our name
        source_id: string
    ): Promise<Deployable> {
        let tags = SerUtil.unpack_tag_instances(reg, dep.tags);
        let counters = SerUtil.unpack_counters_default(dep.counters);
        let unpacked: RegDeployableData = merge_defaults({
            lid: `dep_${source_id}_${lid_format_name(dep.name)}`,
            activation: dep.activation,
            armor: dep.armor,
            deactivation: dep.deactivation,
            deployer: null,
            detail: dep.detail,
            edef: dep.edef,
            evasion: dep.evasion,
            heatcap: dep.heatcap,
            instances: dep.instances,
            name: dep.name,
            recall: dep.recall,
            redeploy: dep.redeploy,
            repcap: dep.repcap,
            save: dep.save,
            sensor_range: dep.sensor_range,
            size: dep.size,
            speed: dep.speed,
            synergies: dep.synergies ?? [],
            tech_attack: dep.tech_attack,
            type: SerUtil.restrict_enum(DeployableType, DeployableType.Deployable, dep.type),
            bonuses: (dep.bonuses ?? []).map(Bonus.unpack),
            actions: (dep.actions ?? []).map(Action.unpack),
            max_hp: dep.hp,
            current_hp: dep.hp,
            avail_mounted: dep.mech ?? true,
            avail_unmounted: dep.pilot ?? false,
            counters,
            tags,
        }, defaults.DEPLOYABLE());
        return reg.get_cat(EntryType.DEPLOYABLE).create_live(ctx, unpacked);
    }

    public async emit(): Promise<PackedDeployableData> {
        return {
            detail: this.Detail,
            name: this.Name,
            size: this.Size,
            type: this.DeployableType,
            actions: await SerUtil.emit_all(this.Actions),
            activation: this.Activation,
            armor: this.Armor,
            bonuses: await SerUtil.emit_all(this.Bonuses),
            cost: this.Cost,
            counters: await SerUtil.emit_all(this.Counters),
            deactivation: this.Deactivation,
            edef: this.BaseEDefense,
            evasion: this.BaseEvasion,
            heatcap: this.BaseHeatCapacity,
            hp: this.BaseMaxHP,
            instances: this.Instances,
            mech: this.AvailableMounted,
            pilot: this.AvailableUnmounted,
            range: [],
            sensor_range: this.BaseSensorRange,
            recall: this.Recall,
            redeploy: this.Redeploy,
            repcap: this.BaseRepairCapacity,
            save: this.BaseSaveTarget,
            speed: this.BaseSpeed,
            synergies: await SerUtil.emit_all(this.Synergies),
            tags: await SerUtil.emit_all(this.Tags),
            tech_attack: this.BaseTechAttack
        };
    }
}
