import { IRangeData, IDamageData } from "@/interface";
import { IEffectData } from "@/interface";
import { ActivationType, EffectType, Damage, Range } from "@/class";
import { ItemEffect } from "./ItemEffect";

interface IProfileEffectData extends IEffectData {
    name: string;
    range?: IRangeData[];
    damage?: IDamageData[];
    detail?: string;
}

class ProfileEffect extends ItemEffect {
    public readonly Name?: string;
    public readonly Detail?: string;
    public readonly Range: Range[];
    public readonly Damage: Damage[];

    public constructor(data: IProfileEffectData) {
        super();
        this.Name = data.name;
        this.Damage = data.damage ? data.damage.map(x => new Damage(x)) : [];
        this.Range = data.range ? data.range.map(x => new Range(x)) : [];
        this.tags = data.tags ? data.tags : [];
        this.Detail = data.detail;
        this.activation = ActivationType.None;
        this.effectType = EffectType.Profile;
        this.tags = data.tags || [];
    }
}

export { IProfileEffectData, ProfileEffect };
