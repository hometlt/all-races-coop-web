<template>
    <v-contextmenu ref="contextmenu">
        <v-contextmenu-item :hide-on-click="false" v-for="(col, index) in columns" :key="index">
            <div class="vtl-context-checkbox">
                <input :id="'checkbox-context' + index" type="checkbox" v-model="col.visible" @change="toggleColumnVisibility(col)">
                <label :for="'checkbox-context' + index"/>
            </div>
            <span>{{col.field}}</span>
        </v-contextmenu-item>
    </v-contextmenu>

    <div class="vtl-card-body" @keydown.esc="discardChanges()" @keydown.enter="applyChanges()">
        <Transition>
            <div v-if="editing.col?.options" class="vtl-loading-mask" @click="applyChanges()"></div>
        </Transition>
        <table  class="vtl-table vtl-table-hover vtl-table-bordered vtl-table-responsive vtl-table-responsive-sm"
                    ref="localTable" :class="{   'fixed-first-column': isFixedFirstColumn,   'fixed-first-second-column': isFixedFirstColumn, }">
                <thead class="vtl-thead" v-contextmenu:contextmenu>



                    <draggable v-model="setting.visibleColumns" tag="tr" :item-key="key => key" handle=".vtl-thead-column span">
                        <template #item="{ element, index }">
                            <th :key="index" class="vtl-thead-th" :class="{'with-icon': element.icon}" :style="{ width: element.width ? element.width : 'auto' }">
                                <div class="vtl-thead-column" :class="theadClasses(element)" @click="doSort(element)">
                                    <span>{{ element.label }}</span>
                                </div>
                                <div class="filter-field">
                                    <div v-if="element.filter">
                                        <input @input="applyFilters" v-model="element.filter.value"/>
                                    </div>
                                </div>
                            </th>
                        </template>
                    </draggable>
                </thead>

                <tbody>
                    <tr v-if="editing.row" ref="edit" @wheel.prevent @touchmove.prevent @scroll.prevent :class="{'modal-edit': editing.col.options}" class="vtl-tbody-tr vtl-edit-row" :style="{top: editing.rowPosition}">
                        <!--                        <td class="vtl-tbody-td"></td>-->
                        <td v-for="(col, j) in setting.visibleColumns" :key="j" :class="{active: editing.col === col }">
                            <div class="vtl-edit" :class="editing.positionClass">
                                <input v-model="editing.value" @input="filterOptions"/>
                                <svg class="corner-right-top" width="10" height="10" viewBox="0 0 10 10"><path fill="white" d="M 0 0 L 0 0 C 5 0 10 5 10 10 L 10 10 L 10 0"/></svg>
                                <svg class="corner-right-bottom" width="10" height="10" viewBox="0 0 10 10"><path fill="white" d="M 0 10 L 0 10 C 5 10 10 5 10 0 L 10 0 L 10 10"/></svg>
                                <svg class="corner-left-top" width="10" height="10" viewBox="0 0 10 10"><path fill="white" d="M 10 0 L 10 0 C 5 0 0 5 0 10 L 0 10 L 0 0"/></svg>
                                <svg class="corner-left-bottom" width="10" height="10" viewBox="0 0 10 10"><path fill="white" d="M 10 10 L 10 10 C 5 10 0 5 0 0 L 0 0 L 0 10"/></svg>
                            </div>

                        </td>
                    </tr>
                    <tr v-else class="vtl-tbody-tr vtl-edit-row" >
                        <td colspan="999"></td>
                    </tr>
                </tbody>



                <draggable v-model="localRows" tag="tbody" item-key="index" class="vtl-tbody" @click="handleTableClick($event)" >
                    <template #item="{element,index}">
                        <tr class="vtl-tbody-tr"  v-if="index > minVisibleRow && index < maxVisibleRow" :class="{selected: element.$selected}">
                            <td v-for="(col, j) in setting.visibleColumns" :key="j" :title="element[col.field]" :style="col.datasource && element[col.field] && styles(col.datasource[element[col.field]])">
                                <img v-if="col.datasource && element[col.field]" :src="icon(col.datasource[element[col.field]])"/>
                                <span @click="debug(col.datasource) ">{{element[col.field]}}</span>
                            </td>
                        </tr>
                        <tr v-else class="vtl-tbody-tr"></tr>
                    </template>
                </draggable>
                <tr :height="editing.expanderSize"></tr>
                <tfoot>
                    <tr>
                        <td colspan="999">
                            <button class="vtl-save" @click="save()">save</button>
                            <div class="vtl-status">{{editing.tableStatus}}</div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        <div v-if="editing.editorTools">
            <button>
                SAVE
            </button>
        </div>
        <div class="vtl-field-options" :style="editing.position" v-if="editing.col?.options">
                    <ul class="vtl-options-list" @click="selectOption($event)"  ref="optionsList" @scroll="handleDebouncedScrollOptions">
                        <template v-for="(option,o) in editing.options" :key="o">
                            <li :style="styles(option)"  v-if="o > minVisibleOption && o < maxVisibleOption">
                                <img :src="icon(option)"/>
                                <span>{{option.id}}</span>
                            </li>
                            <li v-else></li>
                        </template>
                    </ul>
                    <div class="vtl-status">{{editing.optionsTitle}}</div>
                </div>
    </div>
</template>





<script>
    import { debounce } from "debounce";
    import {directive, Contextmenu, ContextmenuItem} from "v-contextmenu"
    import {defineComponent, ref, reactive, nextTick } from "vue";
    import draggable from './draggable/vuedraggable'
    import "v-contextmenu/dist/themes/dark.css";

    let collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: "base",
    });
    //https://github.com/SortableJS/vue.draggable.next/blob/master/example/components/table-example.vue

    export default defineComponent({
        directives: {
            contextmenu: directive,
        },
        components: {
            draggable,
            [Contextmenu.name]: Contextmenu,
            [ContextmenuItem.name]: ContextmenuItem,
        },
        name: "my-table",
        emits: [
            "return-checked-rows",
            "do-search",
            "is-finished",
            "row-clicked",
        ],
        props: {
            // Checkbox (Presence of Checkbox)
            hasFilters: {
                type: Boolean,
                default: false,
            },
            // Checkbox (Returns data type for checked of Checkbox)
            checkedReturnType: {
                type: String,
                default: "key",
            },
            //  (Fixed first column's position)
            isFixedFirstColumn: {
                type: Boolean,
                default: false,
            },
            //  (Field)
            columns: {
                type: Array,
                default: () => {
                    return [];
                },
            },
            //  (data)
            rows: {
                type: Array,
                default: () => {
                    return [];
                },
            },
            // (data row classes)
            rowClasses: {
                type: [Array, Function],
                default: () => {
                    return [];
                },
            },
            // (Total number of transactions)
            total: {
                type: Number,
                default: -1,
            },
            // (Total number of transactions)
            optionsFilter: {
                type: Function,
                default: (item) => true,
            },
            // (Total number of transactions)
            icon: {
                type: Function,
                default: (item) => "",
            },
            // (Total number of transactions)
            styles: {
                type: Function,
                default: (item)=> null,
            },
            // (Sort condition)
            sortable: {
                type: Object,
                default: () => {
                    return {
                        order: "id",
                        sort: "asc",
                    };
                },
            }
        },
        save(){
            console.log(this.DA.tech)
        },
        mounted(){
            this.applyFilters()
            this.handleDebouncedScroll = debounce(this.updateRowsVisibility, 50);
            this.handleDebouncedScrollOptions = debounce(this.updateOptionsVisibility, 50);
            this.$refs.localTable.addEventListener('scroll', this.handleDebouncedScroll);
        },
        methods: {
            // enableEditorTools(event){
            //     console.log(event)
            //     this.editing.editorTools = true
            // },
            // disableEditorTools(event){
            //     console.log(event)
            //     this.editing.editorTools = false
            // },
            debug(value){
                window.x= value
            },
            toggleColumnVisibility (col) {
                if(col.visible){
                    this.setting.visibleColumns.push(col)
                }
                else{
                    this.setting.visibleColumns.splice(this.setting.visibleColumns.indexOf(col),1)
                }
                this.columnsWithOptions = this.setting.visibleColumns.filter(col => col.options)
            },
            theadClasses (col) {
                return {
                    'vtl-sortable': col.sortable,
                    'vtl-both': col.sortable,
                    'vtl-asc': this.setting.order === col.field && this.setting.sort === 'asc',
                    'vtl-desc': this.setting.order === col.field && this.setting.sort === 'desc'
                }
            },
            updateOptionsVisibility() {
                if(!this.editing.options.length){
                    this.minVisibleOption = 0
                    this.maxVisibleOption = 0
                    delete this.editing.optionsTitle
                    return
                }
                let elementHeight = Array.prototype.at.call(this.$refs.optionsList.children, -1).clientHeight
                let scrollPosition = Math.floor(this.$refs.optionsList.scrollTop  / elementHeight)
                let listSize =  Math.ceil(this.$refs.optionsList.clientHeight / elementHeight)
                this.minVisibleOption =  scrollPosition - listSize
                this.maxVisibleOption =  Math.min(scrollPosition + listSize + listSize,this.editing.options.length)

                if(this.editing.options.length > listSize){
                    this.editing.optionsTitle = `${scrollPosition + 1}-${scrollPosition + listSize} / ${this.editing.options.length}`
                }
                else{
                    this.editing.optionsTitle  = `${this.editing.options.length} / ${this.editing.options.length}`
                }
            },
            updateRowsVisibility() {
                let table = this.$refs.localTable
                if(this.localRows.length) {
                    let elementHeight = table.tBodies[1].children[0].clientHeight
                    let scrollPosition = Math.floor(table.scrollTop / elementHeight)
                    let tableSize = Math.ceil((table.clientHeight   - table.tHead.clientHeight - table.tFoot.clientHeight - table.tBodies[0].clientHeight) / elementHeight)
                    this.minVisibleRow = scrollPosition - tableSize
                    this.maxVisibleRow = Math.min(scrollPosition + tableSize + tableSize, this.localRows.length)

                    if (this.localRows.length > tableSize) {
                        this.editing.tableStatus = `${scrollPosition + 1}-${scrollPosition + tableSize} / ${this.localRows.length}`
                    } else {
                        this.editing.tableStatus = `${this.localRows.length} / ${this.localRows.length}`
                    }
                }else{
                    this.minVisibleRow = 0
                    this.maxVisibleRow = 0
                    this.editing.tableStatus = ""
                }
                this.editing.expanderSize = table.clientHeight - table.tHead.clientHeight - table.tFoot.clientHeight - table.tBodies[0].clientHeight - table.tBodies[1].clientHeight
            },
            toggleRowSelection(row){
                row.$selected = !row.$selected
                if(row.$selected){
                    this.setting.selectedRows.push(row)
                }
                else{
                    this.setting.selectedRows.splice(this.setting.selectedRows.indexOf(row),1)
                }
            },
            headerStyle(col){
                return { width: col.width ? col.width : 'auto' }
            },
            headerClass(col){
                return { 'vtl-sortable': col.sortable, 'vtl-both': col.sortable, 'vtl-asc': this.setting.order === col.field && this.setting.sort === 'asc', 'vtl-desc': this.setting.order === col.field && this.setting.sort === 'desc', }
            },
            isEditing(row, col) {
                return this.editing.row === row && this.editing.col === col
            },
            discardChanges() {
                this.editing.row = null
                this.editing.col = null
                this.editing.value = null
            },
            applyChanges() {
                this.editing.row[this.editing.col.field] = this.editing.value
                this.editing.row = null
                this.editing.col = null
                this.editing.value = null
            },
            selectOption(event) {

                if(event.target.nodeName === 'UL'){
                    return false
                }

                let li = event.target; while(li.nodeName !== 'LI')li = li.parentElement;
                let ul = li.parentElement;
                let rowIndex = Array.prototype.indexOf.call(ul.children,li)
                if(rowIndex < 0) return false;
                let option = this.editing.options[rowIndex]
                this.editing.value = option.id
                this.applyChanges()
            },
            handleTableClick(event) {

                if(this.$refs.contextmenu.visible) {
                    return false
                }

                if(event.target.nodeName === 'TBODY' || event.target.nodeName === 'TR'){
                    this.discardChanges()
                    return false
                }


                let td = event.target; while(td.nodeName !== 'TD')td = td.parentElement;
                let tr = td.parentElement;
                let tbody = tr.parentElement;

                let colIndex = Array.prototype.indexOf.call(tr.children,td)
                let rowIndex = Array.prototype.indexOf.call(tbody.children,tr)

                if(rowIndex < 0)return false;

                if(this.editing.row){
                    this.applyChanges()
                    // return false;

                    nextTick(() => {
                        this.edit(rowIndex, colIndex)
                    })
                }
                else{
                    this.edit(rowIndex,colIndex)
                }

            },
            edit(rowIndex,colIndex){

                let row = this.localRows[rowIndex];
                let col = this.setting.visibleColumns[colIndex]
                if(colIndex === 0){
                    this.toggleRowSelection(row)
                }

                if(col.editable === false){
                    return
                }

                let tr  = this.$refs.localTable.tBodies[1].children[rowIndex]

                this.editing.row = row
                this.editing.col = col
                this.editing.columnIndex = colIndex
                this.editing.value = row[col.field]
                this.editing.rowPosition = tr.offsetTop + tr.clientHeight + 'px'
                this.filterOptions()

                nextTick(() =>{
                    this.$refs.edit.children[colIndex].getElementsByTagName("input")[0].focus()
                    this.showOptions()
                })

            },
            showOptions(){

                if(!this.editing.col.options){
                    this.editing.positionClass = ""
                    return;
                }

                let width = this.$refs.localTable.clientWidth;
                let height = this.$refs.localTable.clientHeight;

                let position = this.editing.position
                let rect = this.$refs.edit.children[this.editing.columnIndex].getBoundingClientRect()

                let right = width - rect.right
                let bottom = height - rect.bottom


                if (right > rect.left) {
                    position.left = Math.round(rect.left + rect.width) + 'px'
                    position.right = 'auto'
                    this.editing.positionClass = "rightside"
                } else {
                    position.right = Math.round(right + rect.width) + 'px'
                    position.left = 'auto'
                    this.editing.positionClass = "leftside"
                }

                if (rect.top > bottom) {
                    position.bottom = Math.round(Math.max(bottom - 100, 5)) + 'px'
                    position.top = 'auto'
                } else {
                    position.top = Math.round(Math.max(rect.top - 100,5 )) + 'px'
                    position.bottom = 'auto'
                }
            },
            filterOptions() {
                if(!this.editing.col.options){
                    return
                }

                // if(!this.editing.value){
                //     this.editing.options = this.editing.col.options
                // }
                // else{
                let editingValue = this.editing.value?.toLowerCase();
                this.editing.options = this.editing.col.options.filter(option =>{
                    return this.optionsFilter(option) && (!editingValue || option.id.toLowerCase().includes(editingValue))
                })
                // }
                nextTick(()=>{
                    this.updateOptionsVisibility()
                })
            },
            applyFilters() {
                let filters = {}
                this.columns.forEach((col) => {
                    if (col.filter?.value) {
                        filters[col.field] = col.filter.value.toLowerCase()
                    }
                });

                this.localRows = this.rows.filter(row => {
                    for (let field in filters) {
                        //todo add numbers validation
                        if(field === "index"){
                            if(row[field].toString() !== filters[field])return false
                        }
                        else if(!row[field]?.toLowerCase().includes(filters[field])){
                            return false
                        }
                    }
                    return true
                });
                nextTick(()=>{
                    this.updateRowsVisibility()
                })
            },
            // /**
            //  * Checkbox點擊事件 (Checkbox click event)
            //  */
            // checked (event) {
            //     event.stopPropagation();
            //     let isChecked = [];
            //     this.rowCheckbox.value.forEach((val, i) => {
            //         if (val && val.checked) {
            //             if (this.props.checkedReturnType === "row") {
            //                 isChecked.push(this.localRows.value[i]);
            //             } else {
            //                 isChecked.push(val.value);
            //             }
            //         }
            //     });
            //     // 回傳畫面上選上的資料 (Return the selected data on the screen)
            //     this.$emit("return-checked-rows", isChecked);
            // },
            //
            // /**
            //  * 清空畫面上所有選擇資料 (Clear all selected data on the screen)
            //  */
            // clearChecked ()  {
            //     for(let checkbox of this.rowCheckbox){
            //         checkbox.checked = false
            //     }
            //     this.$emit("return-checked-rows", []);
            // },
            // isAllChecked(){
            //     for( let checkboxValue of this.rowCheckbox.value){
            //         if(!checkboxValue?.checked === true)return false
            //     }
            //     return true
            // },
            doSort (col){
                if(!col.sortable) return;
                let order = col.field
                let sort = "asc";
                if (order === this.setting.order) {
                    if (this.setting.sort === "asc") {
                        sort = "desc";
                    }
                }
                this.setting.order = order;
                this.setting.sort = sort;
                if(this.setting.sort === "desc"){
                    this.localRows.sort((a, b) => - collator.compare(a[order], b[order]));
                }
                else {
                    this.localRows.sort((a, b) => collator.compare(a[order], b[order]));
                }
            }
        },
        computed: {
            keyColumn(props) {
                let key = "";
                Object.assign(props.columns).forEach((col) => {
                    if (col.isKey) {
                        key = col.field;
                    }
                });
                return key;
            }
        },
        data () {
            return {
                localRows: [],
                selectedRows: [],
                minVisibleRow: 0,
                maxVisibleRow: 0,
                minVisibleOption: 0,
                maxVisibleOption: 0,
            }

        },
        setup(props) {
            let visibleColumns = []
            let columnsWithOptions = [];
            props.columns.forEach((col) => {
                col.visible = true;
                visibleColumns.push(col)
                if (col.filter) {
                    col.filter.value = ""
                }
                if(col.options){
                    columnsWithOptions.push(col)
                }
            })
            const editing = reactive({
                editorTools: false,
                row: null,
                col: null,
                value: null,
                position: {},
                positionClass: ""
            })
            const setting = reactive({
                selectedRows: [],
                visibleColumns,
                isCheckAll: false,
                order: props.sortable.order,
                sort: props.sortable.sort
            });
            return {
                columnsWithOptions,
                setting,
                editing,
                tBody: ref  (null),
                localTable: ref  (null),
                optionsList: ref  (null),
                rowCheckbox : ref([])
            }
        }
    });
</script>
