import { Rules, LicensedItem, MountType, ItemType, MechType, CoreSystem } from "@/class";
import { ILicensedItemData, IActionData, IBonusData, ISynergyData, IDeployableData, ICounterData, ICoreSystemData } from "@/interface";
import { imageManagement, ImageTag } from "@/hooks";
import { IArtLocation } from '../Art';

export interface IFrameStats {
    size: number;
    armor: number;
    hp: number;
    evasion: number;
    edef: number;
    heatcap: number;
    repcap: number;
    sensor_range: number;
    tech_attack: number;
    save: number;
    speed: number;
    sp: number;
}


export interface IFrameData  {
  id: string,
  license_level: number, // set to zero for this item to be available to a LL0 character
  source: string, // must be the same as the Manufacturer ID to sort correctly
  name: string,
  mechtype: string[], // can be customized. ex. striker, defender
  y_pos: number, // used for vertical alignment of the mech in banner views (like in the new mech selector)
  description: string, // v-html
  mounts: MountType[],
  stats: IFrameStats,
  traits: IFrameTraitData[],
  core_system: ICoreSystemData,
  image_url?: string,
  other_art?: IArtLocation[]
}

export class Frame extends LicensedItem {
    private _mechtype: MechType[];
    private _y_pos: number;
    private _mounts: MountType[];
    private _stats: IFrameStats;
    private _traits: FrameTrait[];
    private _core_system: CoreSystem;
    private _image_url: string | null;
    private _other_art: { tag: ImageTag; src: string }[];

    public constructor(frameData: IFrameData) {
        super(frameData);
        this._mechtype = frameData.mechtype;
        this._y_pos = frameData.y_pos || 30;
        this._mounts = frameData.mounts;
        this._stats = frameData.stats;
        this._traits = frameData.traits;
        this._core_system = new CoreSystem(frameData.core_system);
        this._item_type = ItemType.Frame;
        this._image_url = frameData.image_url || null;
        this._other_art = frameData.other_art || [];
    }

    public get Mechtype(): MechType[] {
        return this._mechtype;
    }

    public get YPosition(): number {
        return this._y_pos;
    }

    public get OtherArt(): { tag: ImageTag; src: string }[] {
        return this._other_art;
    }

    public get MechTypeString(): string {
        if (this._mechtype.length === 1) return this._mechtype[0];
        return `${this._mechtype[0]} / ${this._mechtype[1]}`;
    }

    public get Mounts(): MountType[] {
        return this._mounts;
    }

    public get Size(): number {
        return this._stats.size;
    }

    public get SizeIcon(): string {
        return `cci-size-${this.Size === 0.5 ? "half" : this.Size}`;
    }

    public get Armor(): number {
        return this._stats.armor;
    }

    public get Structure(): number {
        return Rules.BaseStructure + (this._stats.structuremod || 0);
    }

    public get HP(): number {
        return this._stats.hp;
    }

    public get Evasion(): number {
        return this._stats.evasion;
    }

    public get EDefense(): number {
        return this._stats.edef;
    }

    public get HeatStress(): number {
        return Rules.BaseStress + (this._stats.stressmod || 0);
    }

    public get HeatCap(): number {
        return this._stats.heatcap;
    }

    public get RepCap(): number {
        return this._stats.repcap;
    }

    public get SensorRange(): number {
        return this._stats.sensor_range;
    }

    public get TechAttack(): number {
        return this._stats.tech_attack;
    }

    public get SaveTarget(): number {
        return this._stats.save;
    }

    public get Speed(): number {
        return this._stats.speed;
    }

    public get SP(): number {
        return this._stats.sp;
    }

    public get Traits(): FrameTrait[] {
        return this._traits;
    }

    public get CoreSystem(): CoreSystem {
        return this._core_system;
    }

    public get DefaultImage(): string {
        if (this._image_url) return this._image_url;
        return imageManagement.getImagePath(ImageTag.Frame, `${this.ID}.png`, true);
    }
}
