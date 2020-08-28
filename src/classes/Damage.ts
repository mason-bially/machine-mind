import { DamageType } from "@/class";

//TODO: getDamage(mech?: Mech, mount?: Mount) to collect all relevant bonuses

export interface IDamageData {
    type: DamageType;
    val: string | number;
    override?: boolean | null; // If player can set the damage of this
}

export class Damage {
    private _damage_type: DamageType;
    private _value: string;
    private _raw_value: string | number;
    private _override: boolean;

    public constructor(damage: IDamageData) {
        this._damage_type = this.getDamageType(damage.type);
        this._raw_value = damage.val;
        this._value = typeof damage.val === "number" ? damage.val.toString() : damage.val;
        this._override = damage.override || false;
    }

    public Serialize(): IDamageData {
        return {
            type: this._damage_type,
            val: this._raw_value,
            override: this._override
        }
    }

    private getDamageType(str?: string | null): DamageType {
        switch (str?.toLowerCase()) {
            case "kinetic":
                return DamageType.Kinetic;
            case "energy":
                return DamageType.Energy;
            case "explosive":
                return DamageType.Explosive;
            case "heat":
                return DamageType.Heat;
            case "burn":
                return DamageType.Burn;
        }
        return DamageType.Variable;
    }

    public get Override(): boolean {
        return this._override;
    }

    public get Type(): DamageType {
        return this._damage_type;
    }

    public get Value(): string {
        return this._value;
    }

    //TODO: replace with dicemath
    public get Max(): number {
        if (typeof this._raw_value === "number") return this._raw_value;
        else {
            let bonus = 0;
            if (this._raw_value.split("+").length === 2)
                bonus = parseInt(this._raw_value.split("+")[1]);
            const split = this._raw_value.split("d");
            // (qty * size) + bonus
            return parseInt(split[0]) * parseInt(split[1]) + bonus;
        }
    }

    public get Icon(): string {
        return `cci-${this._damage_type.toLowerCase()}`;
    }

    public get DiscordEmoji(): string {
        return `:cc_damage_${this._damage_type.toLowerCase()}:`;
    }

    public get Color(): string {
        return `damage--${this._damage_type.toLowerCase()}`;
    }

    public get Text(): string {
        if (this._override) return this._value;
        return `${this._value} ${this._damage_type} Damage`;
    }
}
