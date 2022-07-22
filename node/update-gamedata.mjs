import fs from 'fs'
import xml2js from 'xml2js';
import osd from "object-assign-deep";
const objectAssignDeep = (a, ...b) => (osd.withOptions(a,b,{arrayBehaviour: 'merge'}))
const parser = new xml2js.Parser({trim: true, explicitArray: true});

function deepReplaceMatch(obj, testVal, testProp, cb, id) {
    const keys = Object.keys(obj)
    for (let i = 0, len = keys.length; i < len; i++) {
        const prop = keys[i], val = obj[prop]
        if ((!testVal || testVal(val)) && (!testProp || testProp(prop))) cb({val, prop, obj, id})
        if (val && typeof val === 'object') deepReplaceMatch(val, testVal, testProp, cb, prop)
    }
}



function parseEntityString(entityString){

    let stri = 0;
    let incl = 0;
    let start = -1
    let end = -1
    let incl2 = 0
    let start2 = -1
    let end2 = -1
    let other = false
    let filter = false
    let field = entityString
    let filter2 = false
    let partEnded = false
    let otherstart = -1
    while(entityString[stri]){
        if(entityString[stri] === "." && !incl){
            other = entityString.substring(stri + 1)
            otherstart = stri + 1
            partEnded = true;
            if(field.length > stri){
                field = field.substr(0,stri)
            }
        }
        if(entityString[stri] === "{"){
            if(!incl && !incl2 && !partEnded) {
                start = stri
                field = field.substr(0,stri)
            }
            incl++
        }
        else if(entityString[stri] === "}"){
            incl--
            if(!incl && !incl2 && !partEnded) {
                end = stri
                filter = entityString.substring(start+1,end)
            }
        }
        else if(entityString[stri] === "("){
            if(!incl && !incl2) {
                start2 = stri
                field = field.substr(0,stri)
                if(otherstart !== -1){
                    other = entityString.substring(otherstart, stri )
                }
            }
            incl2++
        }
        else if(entityString[stri] === ")"){
            incl2--
            if(!incl && !incl2) {
                end2 = stri
                filter2 = entityString.substring(start2+1,end2)
            }
        }
        stri++
    }

    return {
        otherParts: other,
        filterExpression: filter,
        entityFieldType: field,
        keyField: filter2
    }
}

function getFilteredInstances(Instance,entityString){

    let results = []
    if(entityString.includes(",")){
        entityString.split(",").forEach(part => {
            results.push(...getFilteredInstances(Instance,part))
        })
        return results
    }

    let {entityFieldType, filterExpression, otherParts,keyField} = parseEntityString(entityString)


    let entities = getChildEntities(Instance,entityFieldType)

    if(entities?.length){
        for(let subInstance of entities){
            if(filterExpression){
                let [filterField, filterValue] = filterExpression.split("=")
                let filterResult = getFilteredInstances(subInstance,filterField)
                //{value: "1"}
                if(filterResult[0]?.$.value !== filterValue){
                    continue
                }
                 else{
                    let x = 4
                }
            }
            if(otherParts){
                let subResult = getFilteredInstances(subInstance,otherParts)
                results.push(...subResult)
            }
            else {
                results.push(subInstance)
            }
        }
    }
    return results
}

function getChildEntities(Instance, resultFieldName){

    return Instance[resultFieldName] || Instance.$?.[resultFieldName] && [{$: {value: Instance.$?.[resultFieldName]}}]
}

function AssignData(target, Instance, structure){
    for(let field in structure) {
        let [, resultFieldName, query] = field.match(/(\w+)(?::(.*))?/)

        let entities;
        if (query) {
            entities = getFilteredInstances(Instance, query)
        } else {
            entities = getChildEntities(Instance, resultFieldName)
        }
        if(!entities?.length)continue

        if(structure[field].constructor === Object){
            let forcedKey = query && parseEntityString(query).keyField;
            let key = forcedKey || 'index'


            let editedEntity = target[resultFieldName]
            if(!editedEntity){
                editedEntity = {}
                target[resultFieldName] = editedEntity
            }

            for(let entity of entities) {

                let keyValue = entity.$?.[key]
                if(!keyValue){
                    if(forcedKey){
                        continue
                    }
                    keyValue = 0
                    while( editedEntity[keyValue])keyValue++
                }

                if(!editedEntity[keyValue]) editedEntity[keyValue] = {}
                if(entity.$?.removed){
                    delete editedEntity[keyValue]
                }
                else{
                    AssignData(editedEntity[keyValue], entity, structure[field])
                }

            }
        }
        else if(structure[field].constructor === Array){
            if(!target[resultFieldName]){
                target[resultFieldName] = []
            }
            for(let entity of entities){
                let result;
                if(structure[field][0].constructor !== Object){
                    let obj = {}
                    AssignData(obj, entity, {value: structure[field][0]})
                    result = obj.value
                }
                else{
                    let obj = {}
                    AssignData(obj, entity, structure[field][0])
                    if(entity.$?.index)obj.index = +entity.$.index
                    if(entity.$?.removed)obj.removed = +entity.$.removed
                    result = obj
                }

                target[resultFieldName].push(result)
            }
        }
        else{
            let value = entities[0].$.value
            if(value){
                if( structure[field] !== String &&structure[field] !== Number && structure[field].constructor === Function) {
                    value = structure[field](value, Instance)
                }
                else if(structure[field] === Number){
                    value = +value
                }
                if(value !== undefined && value !== null){
                    target[resultFieldName] = value
                }
            }
        }
    }
}



let regexp = {
    iconpath: /.*[\\\/]/,
    iconext: /\.dds$/i,
    categoeyrace: /Race:(\w+)/
}
//we belevive in a dream
const SC2Icon  = ((value) => (value.replace(regexp.iconpath, "").replace(regexp.iconext, "")))
const SC2Color = ((value) => ("#"+value.split(",").slice(1).map(i => (+i).toString(16).padStart(2, '0')).join("")))
const SC2Link  = String;
const SC2LinkArray = [{Link: String}];
const SC2EditorRace = ((value) => (value.match(regexp.categoeyrace)?.[1]))

const SC2GameDataStructute =  {
    "units:CUnit(id)": {
        parent: SC2Link,
        "race:Race": SC2Link,
        CargoSize : Number,
        Speed : Number,
        Sight : Number,
        Food : Number,
        EnergyMax : Number,
        LifeMax : Number,
        ShieldsMax : Number,
        ShieldArmor : Number,
        LifeArmor : Number,
        "priority:GlossaryPriority" : Number,
        "Minerals:CostResource{index=Minerals}" : Number,
        "Vespene:CostResource{index=Vespene}" : Number,
        Attribute : {value: Number},
        "NoPlacement:EditorFlags{index=NoPlacement}": Number,
        "NoPalettes:EditorFlags{index=NoPalettes}": Number,
        "behaviors:BehaviorArray": [{Link: String}],
        "weapons:WeaponArray" : [{Link: String}],
        "abilities:AbilArray" : [{Link: String}],
        "card:CardLayouts": [{LayoutButtons: [{Face: SC2Link, Row: Number, Column: Number}]}]
    },
    "actors:CActorUnit,CActorMissile(id)": {
        parent: SC2Link,
        LifeArmorIcon: SC2Icon,
        ShieldArmorIcon: SC2Icon,
        "race:EditorCategories": SC2EditorRace,
        "unit:unitName": SC2Link,
        "icon:UnitIcon": SC2Icon,
        "wireframe:Wireframe.Image": SC2Icon,
        "events:On": [{Terms: String, Send: String}]
    },
    "races:CRace(id)": {
        AttributeId: String,
        "icon:Icon": SC2Icon,
        "color:MiniMapBorderColor": SC2Color
    },
    "buttons:CButton(id)": {
        parent: SC2Link,
        "race:Race": SC2EditorRace,
        "icon:Icon": SC2Icon
    },
    "upgrades:CUpgrade(id)": {
        parent: SC2Link,
        "race:Race": SC2Link,
        "icon:Icon": SC2Icon
    },
    "behaviors:CBehaviorBuff(id)": {
        parent: SC2Link,
        "race:Race": SC2EditorRace,
        "icon:InfoIcon": SC2Icon
    },
    // "scores:CScoreValueCustom(id)": {
    //     parent: SC2Link,
    //     "race:Race": SC2EditorRace,
    // },
    // "weapons:CWeaponLegacy(id)|CWeaponStrafe(id)": {
    //     parent: SC2Link,
    //     "race:Race": SC2EditorRace,
    //     "icon:Icon": SC2Icon,
    //     "DisplayEffect": SC2Link,
    //     "DisplayAttackCount": Number,
    //     "Range": Number,
    //     "Period": Number,
    //     "Effect": SC2Link
    // },
    "abilities:CAbilMerge(id)": {
        parent: SC2Link,
        "race:Race": SC2EditorRace,
        "button:CmdButtonArray{index=WithTarget}.DefaultButtonFace": SC2Link
    },
    "abilities:CAbilTransport(id)": {
        parent: SC2Link,
        "race:Race": SC2EditorRace,
        "button:CmdButtonArray{index=Load}.DefaultButtonFace": SC2Link
    },
    "abilities:CAbilBehavior(id)": {
        parent: SC2Link,
        "race:Race": SC2EditorRace,
        "button:CmdButtonArray{index=On}.DefaultButtonFace": SC2Link
    },
    "abilities:CAbilAugment(id),CAbilEffectInstant(id),CAbilEffectTarget(id),CAbilMorph(id),CAbilMorphPlacement(id),CAbilRedirectInstant(id),CAbilRedirectTarget(id)" : {
        parent: SC2Link,
        "race:Race": SC2EditorRace,
        "button:CmdButtonArray{index=Execute}.DefaultButtonFace": SC2Link
    },
    "abilities:CAbilArmMagazine(id),CAbilBuild(id),CAbilResearch(id),CAbilSpecialize(id),CAbilTrain(id),CAbilWarpTrain(id)" : {
        parent: SC2Link,
        "race:Race": SC2EditorRace,
        "info:InfoArray": {
            Time: Number,
            Unit: SC2Link,
            Upgrade: SC2Link,
            Effect: SC2Link,
            "button:Button.DefaultButtonFace": SC2Link
        }
    },
    "commanders:CUser{id=PlayerCommanders}.Instances(Id)":{
        "icon:Image{Field.Id=Icon}.Image": SC2Icon
    },
    "techFields:CUser{id=CommanderTech}.Fields(Id)": [{
        Type: SC2Link,
        UserType: SC2Link,
        GameLinkType: SC2Link,
        EditorColumn: Number
    }],
    "tech:CUser{id=CommanderTech}.Instances(Id)":[{
        "id:Id": String,
        "ability:AbilCmd{Field.Id=ability}.Abil": SC2Link,
        "state:User{Field.Id=upgradelevel}.Instance": SC2Link,
        "commander:User{Field.Id=commander}.Instance": SC2Link,
        "prestige:User{Field.Id=prestige}.Instance": SC2Link,
        "unit:Unit{Field.Id=unit}.Unit": SC2Link,
        "level:Int{Field.Id=level}.Int": SC2Link,
        "upgrade:Int{Field.Id=upgrade}.Upgrade": SC2Link,
        "behavior:GameLink{Field.Id=behavior}.GameLink": SC2Link,
    }],
    "prestiges:CUser{id=PlayerPrestige}.Instances(Id)": {
        "button:GameLink{Field.Id=Icon}.GameLink": SC2Icon
    }
}
// let struct = {
//     effects: {
//         entities: [
//             "CEffectModifyPlayer",
//             "CEffectEnumArea",
//             "CEffectRemoveBehavior",
//             "CEffectSet",
//             "CEffectApplyBehavior",
//             "CEffectCreateUnit",
//             "CEffectDamage",
//             "CEffectLaunchMissile",
//             "CEffectCreatePersistent",
//             "CEffectTeleport",
//             "CEffectModifyUnit",
//             "CEffectEnumTransport",
//             "CEffectEnumTrackedUnits",
//             "CEffectAddTrackedUnit",
//             "CEffectSwitch",
//             "CEffectCancelOrder",
//             "CEffectIssueOrder",
//             "CEffectTransferBehavior",
//             "CEffectApplyKinetic",
//             "CEffectDestroyPersistent",
//             "CEffectReturnMagazine",
//             "CEffectAddTrackedUnits",
//             "CEffectApplyForce",
//             "CEffectCreateHealer",
//             "CEffectRemoveKinetic",
//             "CEffectRedirectMissile",
//             "CEffectEnumMagazine",
//             "CEffectUseMagazine",
//             "CEffectReleaseMagazine",
//             "CEffectMorph",
//             "CEffectUserData",
//             "CEffectUseCalldown"
//         ],
//         fields: {
//
//         }
//     }
// }


function parsegameData (raw) {
    return new Promise((resolve, reject) => {
        parser.parseString(raw, function (err, result) {
            if(err)reject(err)
            resolve(result);
        });
    })
}


async function getGameData(mods){

    const catalogsBase = [
        "GameData/AbilData.xml",
        "GameData/ActorData.xml",
        "GameData/BehaviorData.xml",
        "GameData/ButtonData.xml",
        "GameData/RaceData.xml",
        "GameData/ScoreValueData.xml",
        "GameData/SkinData.xml",
        "GameData/UnitData.xml",
        "GameData/UpgradeData.xml",
        "GameData/RaceData.xml",
        "GameData/UserData.xml",
        "GameData/EffectData.xml",
        "GameData/WeaponData.xml",

    ]
    const IGNORE = {ignore: true}
    const BaseData = {
        abilities: {
            // War3_EffectInstant: {},
            // War3_EffectTarget: {},
            // 'DragonBuild,1': {},
            // 'DragonBuild,2': {},
            // 'DragonBuild,3': {},
            // 'UPLBuildBase,1': {},
            // 'UPLBuildBase,2': {},
            // 'UPLBuildBase,3': {},
            // 'UPLBuildBase,4': {},
            // 'UPLBuildBase,5': {},
            // 'UPLBuildBase,6': {},
            // 'UPLBuildBase,7': {},
            // 'UPLBuildBase,8': {},
            // 'UPLBuildBase,9': {},
            // 'UPLBuildBase,10': {},
            // 'UPLBuildBase,11': {},
            // 'UPLBuildBase,12': {},
            // 'UPLBuildBase,13': {},
            // 'UPLBuildBase,15': {},
            // 'TerranAddOns,4': {}
        },
        units: {
            SS_Plane: IGNORE,
            SS_BackgroundSpace: IGNORE,
            // ExtendingBridge: IGNORE,
            // AiurTempleStoneGate: IGNORE,
            // MetalGate: IGNORE,
            // Tarsonis_Door: IGNORE,
            // StarShipAdun_Door: IGNORE,
            // Purifier_Door: IGNORE,
            // ProtossBridge: IGNORE,
            Shape: IGNORE,
            MISSILE_INVULNERABLE: IGNORE,
            MISSILE: IGNORE,
            MISSILE_HALFLIFE: IGNORE,
            // DESTRUCTIBLE: {},
            PLACEHOLDER: IGNORE,
            SMCHARACTER: IGNORE,
            SMCAMERA: IGNORE,
            SMSET: IGNORE,
            // BEACON: {},
            // PATHINGBLOCKER: {},
            ITEM: IGNORE,
            // War3_Army: {},
            // War3_Missile: IGNORE
        }
    }

    let gameData =  objectAssignDeep({},BaseData )
    for(let mod of mods){

        let catalogsPaths = catalogsBase.slice();

        let modPath = "./../../" + mod + "/";
        let IncludesDataFile = modPath + "GameData.xml";
        if (fs.existsSync(IncludesDataFile)) {
            let includesDataRaw = fs.readFileSync(IncludesDataFile, {encoding: 'utf-8'})
            let IncludesData = await parsegameData(includesDataRaw)
            catalogsPaths.push(...IncludesData.Includes.Catalog.map(catalog => catalog.$.path))
        }

        for(let catalogPath of catalogsPaths){
            let fuullCatalogPath = modPath + catalogPath
            if (fs.existsSync(fuullCatalogPath)) {
                let catalogDataRaw = fs.readFileSync(fuullCatalogPath, {encoding: 'utf-8'})
                let catalogDataXML = await parsegameData(catalogDataRaw)
                AssignData(gameData, catalogDataXML.Catalog,SC2GameDataStructute)
            }
        }
    }
    return gameData
}


(async function run(){
    let gameData = await getGameData([
        "other/0.Core",
        "other/1.Liberty",
        "other/2.Swarm",
        "other/3.Void",
        "other/4.LibertyCampaign",
        "other/5.SwarmCampaign",
        "other/6.VoidCampaign",
        "other/7.VoidMulti",
        "other/8.BalanceMulti",
        "ARC - Core.SC2Mod/Base.SC2Data",
        "RACE - Scion.SC2Mod/Base.SC2Data",
        "RACE - Talon.SC2Mod/Base.SC2Data",
        "RACE - Hybrids.SC2Mod/Base.SC2Data",
        "RACE - Dragons.SC2Mod/Base.SC2Data",
        "RACE - UED.SC2Mod/Base.SC2Data",
        "RACE - UPL.SC2Mod/Base.SC2Data",
        "ARC - Extras.SC2Mod/Base.SC2Data",
        // "other/9.WarCraft",
        // "RACE - WarCraft.SC2Mod/Base.SC2Data",
        // "ARC - WarCraft.SC2Mod/Base.SC2Data",
    ])

    let missedTypes = {}
    function inheritance(instanceType,instanceId){
        let instance = gameData[instanceType][instanceId]
        let parentId = instance.parent
        if(parentId){
            let parent = gameData[instanceType][parentId]
            delete instance.parent
            if(parent){
                inheritance(instanceType,parentId)
                gameData[instanceType][instanceId] = objectAssignDeep({}, parent ,instance)
            }
            else{
                if(!missedTypes[instanceType]){
                    missedTypes[instanceType] = {}
                }
                if(!missedTypes[instanceType][parentId] ){
                    missedTypes[instanceType][parentId] = {}
                }
            }
        }
        else{
            // if(instanceType === "units"){
            //     if(gameData[instanceType][instanceId].dummy !== false){
            //         gameData[instanceType][instanceId] = {...{dummy: true}, ...instance};
            //     }
            // }
        }
    }

    for(let instanceType in gameData){
        for(let instanceId in gameData[instanceType]){
            inheritance(instanceType,instanceId)
        }
    }

    deepReplaceMatch(gameData, val => val.constructor === Array,null, ({val, obj, prop, id}) => {
        let resultObject = {};

        for(let i in val){
            let item = val[i]
            let index = item.index
            if(index !== undefined){
                delete item.index
                if(item.removed){
                    delete resultObject[index]
                    continue
                }
            }
            else{
                index = 0
                while(resultObject[index])index++
            }

            if(resultObject[index]){
                objectAssignDeep(resultObject[index],item)
            }
            else{
                resultObject[index] = item
            }
        }
        obj[prop] = Object.values(resultObject)
    })


        //remove technical races
    for(let id in gameData.races){
        if(!gameData.races[id].AttributeId && !gameData.races[id].icon){
            delete gameData.races[id]
        }
        else{
            delete gameData.races[id].AttributeId
        }
    }

    let ignored = 0
    for(let type in gameData){
        for(let id in gameData[type]){
            if(gameData[type][id].race === "Other" || gameData[type][id].ignore === true){
                ignored++
                delete gameData[type][id]
            }
        }
    }
    console.log("ignored " + ignored)

    for(let actorID in gameData.actors){
        let actor = gameData.actors[actorID]
        let unitName = actor.unit || actorID
        let unit = gameData.units[unitName]
        if(unit){
            unit.actor = actorID
        }
        if(actor.events){
            for(let eventIndex in actor.events){
                let event = actor.events[eventIndex]
                if(event.Send === "Create" && event.Terms?.match(/^(UnitConstruction|UnitBirth)/)){
                    let eventUnitID = event.Terms.split(".")[1].replace("##unitName##", unitName).replace("##id##", actorID)

                    let eventUnit = gameData.units[eventUnitID]
                    if(eventUnit && !eventUnit.actor){
                        eventUnit.actor = actorID
                    }
                }
            }
        }
        delete actor.events;
    }


    let images = [];

    fs.readdirSync('./../public/assets/buttons/').forEach(file => {
        if(file.endsWith(".png")){
            images.push(file.substring(0,file.length - 4))
        }
    });


    deepReplaceMatch(gameData, null, prop => prop === "icon" || prop === "wireframe", ({val, obj, prop, id}) => {
        if(obj.unit){
            val = val.replace("##unitName##",obj.unit)
        }
        obj[prop] = val.replace("##id##", id)

        if(!fs.existsSync(`./../public/assets/buttons/${obj[prop]}.png`)){
            obj[prop + "broken"] = true
        }
        // if(!images.includes(obj[prop])){
        //     obj[prop + "broken"] = true
        // }
    })

    for(let unitID in gameData.units){
        let unit = gameData.units[unitID]
        if(unit.actor){
            let actor = gameData.actors[unit.actor]


            if(actor.icon === "btn-missing-kaeo" ){
                delete actor.icon
            }

            if(actor.icon && !actor.iconbroken){
                unit.icon = actor.icon
            }
            else if (actor.wireframe && !actor.wireframebroken){
                unit.icon = actor.wireframe
            }
            else if(actor.icon || actor.wireframe){
                unit.icon = actor.icon || actor.wireframe
                unit.iconbroken = true
            }
            if(actor.iconbroken){
                console.warn(actor.icon)
            }
            if((!actor.icon || actor.iconbroken) && actor.wireframebroken){
                console.warn(actor.wireframe)
            }

            if(actor.LifeArmorIcon){
                unit.LifeArmorIcon = actor.LifeArmorIcon
            }
            if(actor.ShieldArmorIcon){
                unit.ShieldArmorIcon = actor.ShieldArmorIcon
            }
            delete unit.actor
        }

        if(!unit.icon &&!unit.priority || unit.NoPalettes || unit.NoPlacement){
          //  console.log(unitID)
            delete gameData.units[unitID]
        }
    }
    // delete gameData.actors

    for(let id in gameData.units){
        let unit = gameData.units[id]
        if(unit.weapons) unit.weapons = unit.weapons.map(i => i.Link)
        if(unit.abilities) unit.abilities = unit.abilities.map(i => i.Link)
        if(unit.behaviors) unit.behaviors = unit.behaviors.map(i => i.Link)
        if(unit.card){
            for(let layoutindex in unit.card){
                let layout = unit.card[layoutindex].LayoutButtons
                unit.card[layoutindex] = {}
                if(layout){
                    for(let {Column,Row,Face} of layout){
                        Column = +Column || 0
                        Row = +Row || 0
                        if(Column > 3 || Row > 2)continue;
                        let position = Column + "x" + Row
                        if(!unit.card[layoutindex][position]){
                            unit.card[layoutindex][position] = []
                        }
                        unit.card[layoutindex][position].push(Face)
                    }
                }
            }
        }
    }
    gameData.icons = images
    // gameData.tech = Object.values(gameData.tech)


    let finalDataBeautified = JSON.stringify(gameData, null, "\t");


    fs.writeFileSync("./../public/gamedata.json",finalDataBeautified)
})()