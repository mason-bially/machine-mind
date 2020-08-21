import uuid from "uuid/v4";
import { store } from "@/hooks";

export interface IDeployableData {
    name: string;
    source: string;
    license: string;
    size: number;
    hp: number;
    count?: number;
    duration?: number;
    armor?: number;
    evasion: number;
    edef: number;
    detail: string;
}

export interface IDeployedData {
    id: string;
    assigned_name: string;
    current_hp: number;
    current_duration?: number;
    overshield?: number;
    isDestroyed?: boolean;
}

export class Deployable {
    public readonly ID: string;
    public readonly BaseName: string;
    private _name: string = "";
    public readonly Source: string;
    public readonly License: string;
    public readonly Detail: string;
    public readonly Size: number;
    public readonly MaxHP: number;
    private _current_hp: number;
    public readonly Armor: number;
    public readonly Evasion: number;
    public readonly EDefense: number;
    private _isDestroyed: boolean;

    public constructor(data: IDeployableData, owner?: string, n?: number) {
        this.ID = uuid();
        this.BaseName = `${owner ? `${owner}'s ` : ""}${data.name}${n ? ` (#${n})` : ""}`;
        this.Source = data.source;
        this.License = data.license;
        this.Detail = data.detail;
        this.Size = data.size;
        this.MaxHP = data.hp;
        this._current_hp = this.MaxHP;
        this.Armor = data.armor || 0;
        this.Evasion = data.evasion;
        this.EDefense = data.edef;
        this._isDestroyed = false;
    }

    private save(): void {
        store.pilots.saveData();
    }

    public get Name(): string {
        return this._name ? this._name : this.BaseName;
    }

    public set Name(name: string) {
        this._name = name;
        this.save();
    }

    public get CurrentHP(): number {
        if (this._current_hp > this.MaxHP) this.CurrentHP = this.MaxHP;
        return this._current_hp;
    }

    public set CurrentHP(hp: number) {
        if (hp > this.MaxHP) this._current_hp = this.MaxHP;
        else if (hp <= 0) {
            this.IsDestroyed = true;
        } else this._current_hp = hp;
        this.save();
    }

    public get IsDestroyed(): boolean {
        return this._isDestroyed;
    }

    public set IsDestroyed(val: boolean) {
        this._isDestroyed = val;
        this.save();
    }

    public static Serialize(deployable: Deployable): IDeployedData {
        return {
            id: deployable.ID,
            assigned_name: deployable.Name,
            current_hp: deployable.CurrentHP,
            isDestroyed: deployable.IsDestroyed,
        };
    }

    public static Deserialize(base: IDeployableData, data: IDeployedData): Deployable {
        const d = new Deployable(base);
        d.Name = data.assigned_name;
        d.CurrentHP = data.current_hp;
        d.IsDestroyed = data.isDestroyed || false;
        return d;
    }
}
