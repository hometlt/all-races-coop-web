<template>
    <div class="page" v-if="DA">
        <nav>
            <ul class="tabs">
                <li :class="{active: activeCatalog === cat }" v-for="(cat , i) in DA.catalogs" :key="i" @click="setActiveCatalog(cat)">
                    {{cat.id}}
                    <span v-if="raceFiltersActive.length">({{cat.count}})</span>
                </li>
            </ul>

            <ul class="vtl-options-filters">
                <template v-for="(race,i) of raceFilters" :key="i">
                    <li :title="race.name || race.id" :class="{active: raceFiltersActive.includes(race.id)}" @click="toggleRaceFilter(race)">
                        <img :src="icon(race)"/>
                    </li>
                </template>
            </ul>
        </nav>

        <section v-if="activeCatalog.id === 'tech'" class="table-section">
            <table-lite :columns="dataStructure"
                        :rows="DA.tech"
                        :options-filter="isFiltered"
                        :icon="icon"
                        :styles="styles"
                        :sortable="sortable"
                        :has-filters="true">
            </table-lite>
        </section>
        <section v-if="activeCatalog && activeCatalog.id !== 'tech'" class="units-section">
            <ul class="instances" v-if="DA">
                <template v-for="(instance, j) of DA[activeCatalog.id]" :key="j" >
                    <li :title="instance.id" v-if="isFiltered(instance)">
                        <template v-if="isOnScreen(instance)">
                            <span class="icon-holder"><img :src="icon(instance)"></span>

                            <span class="unit-statusbar" v-if="instance.LifeMax">
                                <span class="stats">
                                    <div>
                                        <span v-if="instance.ShieldsMax">{{instance.ShieldsMax}}</span>
                                        <span v-if="instance.LifeMax">{{instance.LifeMax}}</span>
                                    </div>
                                    <span v-if="instance.EnergyMax">{{instance.EnergyMax}}</span>
                                </span>
                                <template v-if="instance.ShieldsMax">
                                    <span class="shields"           :style="{'background-size':  Math.ceil(48 / ((instance.ShieldsMax)        / 32)) + 'px 3px' }"         v-if="instance.ShieldsMax<=1000"></span>
                                    <span class="shields more"      :style="{'background-size':  Math.ceil(48 / ((instance.ShieldsMax - 1000) / 32)) + 'px 3px, 2px 3px, 50px 3px'}" v-else-if="instance.ShieldsMax<=2000"></span>
                                    <span class="shields evenmore"  :style="{'background-size':  Math.max(2,Math.ceil(48 / ((instance.ShieldsMax - 2000) / 32))) + 'px 2px, 2px 4px, 50px 2px'}" v-else></span>
                                </template>
                                <template v-if="instance.LifeMax">
                                    <span class="life"           :style="{'background-size':  Math.ceil(48 / ((instance.LifeMax)        / 32)) + 'px 3px' }"         v-if="instance.LifeMax<=1000"></span>
                                    <span class="life more"      :style="{'background-size':  Math.ceil(48 / ((instance.LifeMax - 1000) / 32)) + 'px 3px, 2px 3px, 50px 3px'}" v-else-if="instance.LifeMax<=2000"></span>
                                    <span class="life evenmore"  :style="{'background-size':  Math.max(2,Math.ceil(48 / ((instance.LifeMax - 2000) / 32))) + 'px 2px, 2px 4px, 50px 2px'}" v-else></span>
                                </template>
                                <span class="energy" :style="{'background-size':  Math.ceil(25 / ((instance.EnergyMax)        / 32)) + 'px 3px' }"  v-if="instance.EnergyMax"></span>
                            </span>
                            <div class="unit-stats">
                                <span class="unit-name">{{instance.id}}</span>
                                <span class="unit-cost">
                                    <span class="resources-minerals" v-if="instance.Minerals">{{instance.Minerals}}</span>
                                    <span class="resources-vespene" v-if="instance.Food">{{instance.Vespene}}</span>
                                    <span class="resources-supply" v-if="instance.Food">{{instance.Food}}</span>
                                </span>
                                <span class="unit-combat">
                                    <span class="unit-armor" v-if="instance.LifeArmorIcon !== undefined"><span>{{instance.LifeArmor}}</span><img :src="icon({icon: instance.LifeArmorIcon})"/></span>
                                    <span class="unit-shield" v-if="instance.ShieldArmorIcon!== undefined"><span>{{instance.ShieldArmor}}</span><img :src="icon({icon: instance.ShieldArmorIcon})"/></span>
                                </span>



                                <div  v-if="instance.card" class="cards" >
                                    <table v-for="(card, o) in instance.card" :key="o">
                                        <tr v-for="y in [0,1,2]" :key="y">
                                            <td v-for="x in [0,1,2,3]" :key="x" @click="switchIcon(card[y][x])">
                                                <span v-if="card[y][x]" :title="card[y][x].at(-1).button">
                                                    <img :src="icon(card[y][x].at(-1))" />
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </template>
                    </li>
                </template>
            </ul>
        </section>
    </div>
</template>


<script>
    import {reactive} from "vue";
    import axios from 'axios';
    import TableLite from "./table";
    import "./style.less"
    import osd from "object-assign-deep";

    let NORACE =  {icon: "ui_ingame_help_techtree_questionmark"}

    const objectAssignDeep = (a, ...b) => {
        return osd.withOptions(a,b,{arrayBehaviour: 'merge'})
    }

    let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base",});

    export default {
        name: 'UsersComponent',

        components: {
            TableLite: TableLite
        },
        methods: {
            switchIcon(layoutSlot){
                if(layoutSlot?.length > 1){
                    layoutSlot.unshift(layoutSlot.pop())
                }
            },
            isOnScreen(instance){
                return true
            },
            isFiltered(instance){
                if(this.raceFiltersActive.includes("all")){
                    return true
                }
                if(instance.race){
                    return this.raceFiltersActive.includes(this.DO.races[instance.race]?.race || instance.race)
                }

                return this.raceFiltersActive.includes("none")
            },
            setActiveCatalog(category){
                this.activeCatalog = category
            },
            icon(item){
                if(!item){
                    return this.icon(NORACE)
                }
                if(item.icon && !item.iconbroken) {
                    return `assets/buttons/${item.icon}.png`
                }
                if(item.button && this.DO.buttons[item.button]){
                    return this.icon(this.DO.buttons[item.button])
                }
                if(item.race){
                    return this.icon(this.DO.races[item.race])
                }
                return this.icon(NORACE)
            },
            styles(item){
                if(!item)return false
                if(item.color) {
                    return {'background-color': item.color + "22"}
                }
                if(item.race){
                    return this.styles(this.DO.races[item.race])
                }
                return null
            },
            toggleRaceFilter(race){
                if(!this.raceFiltersActive.includes(race.id)){
                    this.raceFiltersActive.push(race.id)
                }
                else{
                    this.raceFiltersActive.splice(this.raceFiltersActive.indexOf(race.id),1)
                }

                if(this.raceFiltersActive.length) {
                    for (let catalog of this.DA.catalogs) {
                        let counter = 0
                        for (let instance of this.DA[catalog.id]) {
                            if(this.isFiltered(instance))counter++
                        }
                        catalog.count = counter
                    }
                }
            },
            getEditorData(DO){

                this.DO = DO;

                objectAssignDeep(DO,{
                    races: {

                        ued: {color: "#ffffa4"},
                        Gen: {color: "#80f0ff"},
                        Keir: {color: "#ffff80"},
                        Xayi: {color: "#ff7129"},
                        Prot: {color: "#4bb6fd"},
                        Terr: {color: "#4da05f"},
                        Zerg: {color: "#8b49ff"},
                        Neut: {color: "#e7e7e7"},
                        Dragon: {color: "#ff1a1a"},
                        NHbr: {color: "#000000"},
                        UPL: {color: "#acd9ff"},


                        Keiron: { race: "Keir"},
                        Genetron: { race: "Gen"},
                        Xayid: {race: "Xayi"},
                        Protoss: { race: "Prot"},
                        Terran: { race: "Terr"},
                        UED: { race: "ued"},
                        InfestedTerran: {race: "TerrI"},
                        PrimalZerg: {race: "ZergP"},
                        Neutral: {race: "Neut"},

                        // neut: {race: "neutral"},
                        // terr: {race: "terran"},
                        // prot: {race: "protoss"},
                        // terri: {race: "terran", "icon": "InfestedTerranLogo"},
                        // zergp: {race: "zerg","icon": "PrimalZergLogo"},
                        // terrd: {race: "terran",  "icon": "TerranDominionLogo"},
                        // zerge: {race: "zerg", "icon": "TheSwarmLogo"},
                        // gen: {race: "genetron"},
                        // keir: {race: "keiron"},
                    }

                })



                this.DA = {
                    buttons: [],
                    tech: [],
                    commanders: [],
                    prestiges: [],
                    units: [],
                    upgrades: [],
                    abilities: [],
                    behaviors: [],
                    races: []
                }


                
                // DO.races = {
                //     protoss: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_normal_prot"},
                //     terran: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_normal_terr"},
                //     zerg: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_normal_zerg"},
                //     neutral: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_normal_rand"},
                //     dragon: {icon: "icon-1v1-dragon"},
                //     genetron: {icon: "icon-1v1-genetron"},
                //     hybrid: {icon: "icon-1v1-hybrid"},
                //     keiron: {icon: "icon-1v1-keiron"},
                //     ued: {icon: "icon-1v1-ued"},
                //     upl: {icon: "icon-1v1-upl"},
                //     xayid: {icon: "icon-1v1-xayid"},
                //     neut: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_selected_rand"},
                //     terr: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_selected_terr"},
                //     terri: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_selected_terr"},
                //     prot: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_selected_prot"},
                //     zergp: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_selected_zerg"},
                //     infestedterran: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_selected_zerg"},
                //     primalzerg: {icon: "ui_battlenet_glues_multiplayer_racebutton_raceicon_selected_zerg"},
                //     hybr: {icon: "icon-1v1-hybrid"},
                //     MISSED: {icon: "sc2_ui_coop_cappedicon"},
                //     NONE:
                // }


                let missed = {
                    icons: [],
                    wireframes: [],
                    races: [],
                    buttons: []
                }

                for(let type of ["abilities", "prestiges"]){
                    for(let id in DO[type]){
                        let instance = DO[type][id]
                        let buttonID = instance.button
                        if (buttonID && !DO.buttons[buttonID] && !missed.buttons.includes(buttonID)){
                            missed.buttons.push(buttonID)
                        }
                    }
                }

                this.DA.icons = DO.icons;
                DO.icons = {}
                for(let index in this.DA.icons){
                    this.DA.icons[index] = DO.icons[this.DA.icons[index]] = {id: this.DA.icons[index] , icon: this.DA.icons[index]}
                }

                for(let type of ["races","buttons", "commanders", "units", "upgrades", "behaviors","abilities", "prestiges"]){
                    for(let id in DO[type]){
                        let instance = DO[type][id]
                        if(instance.race){
                            if(DO.races[instance.race]){
                                if(!DO.races[instance.race].race){
                                    if (!this.raceFilters.includes(DO.races[instance.race])){
                                        this.raceFilters.push(DO.races[instance.race])
                                    }
                                }
                            }
                            else  if (!missed.races.includes(instance.race)){
                                missed.races.push(instance.race)
                                let newRace = {
                                    id: instance.race
                                }
                                this.raceFilters.push(newRace)

                                DO.races[instance.race] = newRace
                            }

                        }
                        instance.id = id
                        this.DA[type].push(instance)
                    }
                    this.DA[type].sort((a, b) => collator.compare(a.id, b.id));
                }

                for(let unit of this.DA.units){
                    let ocards = unit.card;
                    if(ocards){
                        let ncards = []
                        for(let ocard of ocards){
                            let ncard = [[],[],[]]
                            ncards.push(ncard)

                            for(let lb in ocard) {
                                let [x, y] = lb.split("x")
                                for(let bb in ocard[lb]) {
                                    if(!ncard[y][x]){
                                        ncard[y][x] = []
                                    }
                                    ncard[y][x].push({button: ocard[lb][bb]})
                                }
                            }
                        }
                        unit.card = ncards
                    }
                }


                DO.catalogs = {
                    tech: {id: "tech"},
                    buttons: {id: "buttons"},
                    units: {id: "units"},
                    upgrades: {id: "upgrades"},
                    abilities: {id: "abilities"},
                    behaviors: {id: "behaviors"},
                    // {id: "icons"}
                }
                this.DA.catalogs = Object.values(DO.catalogs)

                this.DA.tech =  DO.tech;
                DO.tech = {}
                for(let index = 0; index < this.DA.tech.length; index++){
                    let tech = this.DA.tech[index]

                    Object.defineProperty(tech, 'index', {
                        get: () =>{
                            return this.DA.tech.indexOf(tech)
                        },
                        set: (newValue) => {

                        },
                        enumerable: true,
                        configurable: true
                    });
                    DO.tech[tech.id] = tech

                }

                window.RF = this.raceFilters
                window.DA = DO
                this.activeCatalog =  DO.catalogs.tech
                this.dataStructure = [
                    {
                        label: "#",
                        field: "index",
                        editable: false,
                        width: "5%",
                        sortable: true,
                        filter: {method: "contains",value: ""},
                        isKey: true
                    },
                    {
                        label: "ID",
                        field: "id",
                        width: "30%",
                        filter: {method: "contains",value: ""},
                        data: {
                            unique: true
                        },
                        sortable: true,
                    },
                    {
                        label: "Commander",
                        field: "commander",
                        icon: true,
                        width: "30%",
                        sortable: true,
                        options: this.DA.commanders,
                        datasource: this.DO.commanders,
                        filter: {method: "contains",value: ""},
                    },
                    {
                        label: "Prestige",
                        field: "prestige",
                        icon: true,
                        width: "30%",
                        sortable: true,
                        options: this.DA.prestiges,
                        datasource: this.DO.prestiges,
                        filter: {method: "contains",value: ""},
                    },
                    {
                        label: "Ability",
                        field: "ability",
                        icon: true,
                        width: "30%",
                        sortable: true,
                        options: this.DA.abilities,
                        datasource: this.DO.abilities,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Behavior",
                        field: "behavior",
                        icon: true,
                        width: "30%",
                        sortable: true,
                        options: this.DA.behaviors,
                        datasource: this.DO.behaviors,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Upgrade",
                        field: "upgrade",
                        icon: true,
                        width: "30%",
                        sortable: true,
                        options: this.DA.upgrades,
                        datasource: this.DO.upgrades,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Unit",
                        field: "unit",
                        icon: true,
                        width: "30%",
                        sortable: true,
                        options: this.DA.units,
                        datasource: this.DO.units,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Button",
                        field: "button",
                        icon: true,
                        width: "30%",
                        sortable: true,
                        options: this.DA.buttons,
                        datasource: this.DO.buttons,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Icon",
                        field: "icon",
                        icon: true,
                        width: "30%",
                        options: this.DA.icons,
                        datasource: this.DO.icons,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Race",
                        field: "race",
                        icon: true,
                        width: "30%",
                        options: this.DA.races,
                        datasource: this.DO.races,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Tech",
                        field: "tech",
                        icon: true,
                        width: "30%",
                        options: this.DA.tech,
                        datasource: this.DO.tech,
                        filter: {method: "contains",value: ""}
                    },
                    {
                        label: "Lvl",
                        field: "level",
                        width: "5%",
                        filter: {method: "equal",value: ""},
                        data: {
                            type: Number, min: 0, max: 15
                        },
                        sortable: true
                    },
                    {
                        label: "On",
                        field: "upgradelevel",
                        filter: {method: "equal",value: ""},
                        data: {
                            type: Boolean
                        },
                        width: "5%"
                    }
                ]
            },
        },
        created() {
            axios.get('./gamedata.json').then(res => this.getEditorData(res.data))
        },
        data () {


            return reactive({
                raceFilters: [
                    {id: "all", name: "All Races", icon: 'ui_battlenet_glue_coop_newuser_splashicon'},
                    {id: "none", name:"No Race", icon: 'sc2_ui_coop_circularprogress_basic_bar' }
                ],
                raceFiltersActive: ["all"],
                activeCatalog: null,
                sortable: {order: "index", sort: "asc"},
                dataStructure: null,
                DA: null,
                DO: null
            })
        }
    }
</script>


<style>
    body{
        overflow: hidden;
    }
    h3 {
        margin-bottom: 5%;
    }
    .blog-body{
        color:white;
    }
    .table{

        color: white;
    }
    td.vtl-tbody-td {
        font-size: 11px;
        padding: 0 4px !important;
        text-align: left;
        max-width: 100px;
    }
    th.vtl-thead-th{
        font-size: 11px;
        padding: 6px 4px !important;
        text-align: left;
    }

    th.filter-field{
        padding: 2px 1px 2px 1px !important;
        height: 28px;
    }
    th input{
        display: flex;
        width: 100%;
        height: 100%;
    }
    th.vtl-thead-th {
        border: 0 !important;
    }


    .vtl-thead-column.vtl-sortable.vtl-both {
        padding-right: 20px !important;
    }

    thead {
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .vtl-table {
        background: white;
        left: -1px;
        position: relative;
    }

    tr.vtl-tbody-tr {
        height: 39px;
    }

    td.vtl-tbody-td img{
        margin-right: 4px;
    }
</style>
