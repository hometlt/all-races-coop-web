<template>
    <div class="page" v-if="DA">
        <nav>
            <ul class="tabs">
                <li :class="{active: activeCatalog === cat }" v-for="(cat , i) in DA.catalogs" :key="i" @click="setActiveCatalog(cat)">
                    {{cat.id}}
                    <span v-if="unitTypeFilersActive.length && raceFiltersActive.length">({{cat.count}})</span>
                </li>
            </ul>

            <ul class="vtl-options-filters">
                <template v-for="(ut,i) of DA.unitTypes" :key="i">
                    <li :title="ut.name || ut.id" :class="{active: unitTypeFilersActive.includes(ut.id)}" @click="toggleUnitTypeFilter(ut)">
                        <img :src="icon(ut)"/>
                    </li>
                </template>
            </ul>
            <ul class="vtl-options-filters">
                <template v-for="(race,i) of DA.races" :key="i">
                    <li v-if="!race.race && race.used" :title="race.name || race.id" :class="{active: raceFiltersActive.includes(race.id)}" @click="toggleRaceFilter(race)">
                        <img :src="icon(race)"/>
                    </li>
                </template>
            </ul>
        </nav>

        <section v-if="activeCatalog?.id === 'tech'" class="table-section">
            <table-lite :columns="techStructure"
                        :create-row="createTech"
                        :rows="DA.Tech"
                        :options-filter="isFiltered"
                        :icon="icon"
                        :styles="styles"
                        :save="save"
                        :sortable="sortable"
                        :has-filters="true">
            </table-lite>
        </section>

        <section v-else-if="activeCatalog?.id === 'replacement'" class="table-section">
            <table-lite :columns="replacementStructure"
                        :rows="DA.replacement"
                        :options-filter="isFiltered"
                        :icon="icon"
                        :styles="styles"
                        :save="save"
                        :sortable="sortable"
                        :has-filters="true">
            </table-lite>
        </section>
        <section v-else class="units-section">
            <ul class="instances" v-if="DA">
                <template v-for="(instance, j) of DA[activeCatalog.id]" :key="j" >
                    <li :title="instance.id" v-if="isFiltered(instance,activeCatalog.id)">
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
                                            <td v-for="x in [0,1,2,3,4]" :key="x" @click="switchIcon(card[y][x])">
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
    import TableLite from "./TableComponent";
    import {fromXMLObject,sc2race,sc2icon,toXMLObject,getTableColumns} from "../../_website-server/server/sc2"
    import "./style.less"

    
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
            isFiltered(instance, instanceType){




                let unitType = instance.Type

                if(['Unit','Structure','Hero'].includes(unitType)) {
                    if (!this.unitTypeFilersActive.includes(unitType)) {
                        return false;
                    }
                }
                else{
                    if (!this.unitTypeFilersActive.includes("Other")) {
                        return false;
                    }
                }


                if(!this.raceFiltersActive.includes("all")) {
                    let race = sc2race(instance,this.DO)
                    if(race){
                        if (!this.raceFiltersActive.includes(race.id)){
                            return false
                        }
                    }
                    else {
                        if (!this.raceFiltersActive.includes("none")){
                            return false
                        }
                    }
                }

                return true
            },
            setActiveCatalog(category){
                this.activeCatalog = category
            },
            icon(item){
                return sc2icon(item,this.DO)
            },
            styles(item){
                if(!item) return false
                let race = sc2race(item, this.DO)
                if(!race) return false
                if(race.color) {
                    return {'background-color': race.color + "22"}
                }
                return null
            },
            updateRaceCounters(){
                if(this.raceFiltersActive.length && this.unitTypeFilersActive.length) {
                    for (let catalog of this.DA.catalogs) {
                        let counter = 0
                        for (let instance of this.DA[catalog.id]) {
                            if(this.isFiltered(instance, catalog.id))counter++
                        }
                        catalog.count = counter
                    }
                }
            },
            toggleUnitTypeFilter(unitType){
                if(!this.unitTypeFilersActive.includes(unitType.id)){
                    this.unitTypeFilersActive.push(unitType.id)
                }
                else{
                    this.unitTypeFilersActive.splice(this.unitTypeFilersActive.indexOf(unitType.id),1)
                }
                this.updateRaceCounters()
            },
            toggleRaceFilter(race){
                if(!this.raceFiltersActive.includes(race.id)){
                    this.raceFiltersActive.push(race.id)
                }
                else{
                    this.raceFiltersActive.splice(this.raceFiltersActive.indexOf(race.id),1)
                }
                this.updateRaceCounters()
            },
            download(filename, text) {
                let href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);

                window.open(href,'_blank');
                //
                // let element = document.createElement('a');
                // element.setAttribute('href', );
                // element.setAttribute('download', filename);
                //
                // element.style.display = 'none';
                // document.body.appendChild(element);
                //
                // element.click();
                //
                // document.body.removeChild(element);



            },
            createTech(){
                //todo
                let tech ={id: 'id' + (new Date()).getTime() };

                Object.defineProperty(tech, 'index', {
                    get: () =>{
                        return this.DA.Tech.indexOf(tech)
                    },
                    set: (newValue) => {

                    },
                    enumerable: true,
                    configurable: true
                });


                // Object.defineProperty(tech, 'id', {
                //     get: function () {
                //         return "" +
                //             (this.race || "") +
                //             (this.commander || "") +
                //             (this.prestige ? "prestige"+this.prestige : "") +
                //             (this.level ? "Level"+this.level : "") +
                //             "_"+
                //             (this.unit || "") +
                //             (this.ability || "") +
                //             (this.upgrade || "") +
                //             (this.behavior || "") +
                //             (this.state || "ON")
                //     },
                //     set: (newValue) => {
                //     },
                //     enumerable: true,
                //     configurable: true
                // });

                this.DO.Tech[tech.id] = tech

                return tech

            },
            save(){
                console.log(this.DA,this.DO,this.CF)
                return toXMLObject({Tech: this.DA.Tech},this.DO,this.CF)

                // return toXMLObject({replacement: this.DA.replacement},this.DO,this.CF)
                // this.download("output.xml",xml);
            },
            getEditorData(data){
                let {DA,DO,CF} = fromXMLObject(data)

                CF.replacement = DO.replacementFields
                CF.Tech = DO.TechFields
                delete DO.TechFields
                delete DO.replacementFields

                for(let field of CF.Tech){
                    if(CF[field.Type].find(item => item.id === "race")){
                        this.isRaceFiltered[field.id] = true
                    }
                }

                this.techStructure = getTableColumns(DA,DO,CF.Tech)
                this.replacementStructure = getTableColumns(DA,DO,CF.replacement)
                this.DA = DA;
                this.DO = DO
                this.CF = CF
                this.activeCatalog =  DO.catalogs.tech
                this.updateRaceCounters()
            },
        },
        created() {
            axios.get('./gamedata.json').then(res => this.getEditorData(res.data))
        },
        data () {


            return reactive({
                isRaceFiltered: {},
                unitTypeFilersActive: ["Structure","Unit","Hero","Other"],
                raceFiltersActive: ["all"],
                activeCatalog: null,
                sortable: {order: "index", sort: "asc"},
                techStructure: null ,
                replacementStructure: null ,
                DA: null,
                DO: null
            })
        }
    }
</script>
