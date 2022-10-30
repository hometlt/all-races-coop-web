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


    <v-contextmenu ref="contextmenu2">
        <v-contextmenu-item :hide-on-click="true" @click="removeRow">
            Remove Row
        </v-contextmenu-item>
        <v-contextmenu-item :hide-on-click="true" @click="insertRowBefore">
            Insert Before
        </v-contextmenu-item>
        <v-contextmenu-item :hide-on-click="true" @click="insertRowAfter">
            Insert After
        </v-contextmenu-item>
    </v-contextmenu>

    <div  v-if="view === 'TABLE'" class="vtl-card-body" @keydown.esc="discardChanges()" @keydown.enter="applyChanges()">
        <Transition>
            <div v-if="editing.col?.options" class="vtl-loading-mask" @click="applyChanges()"></div>
        </Transition>
        <table @mousedown="tableDragStart($event)" @mousemove="tableDragMove($event)" @mouseleave="tableDragEnd($event)" @mouseup="tableDragEnd($event)" class="vtl-table vtl-table-hover vtl-table-bordered vtl-table-responsive vtl-table-responsive-sm"
                    ref="localTable" :class="{   'fixed-first-column': isFixedFirstColumn,   'fixed-first-second-column': isFixedFirstColumn, }">
                <thead class="vtl-thead" v-contextmenu:contextmenu>



<!--                    <draggable v-model="setting.visibleColumns" tag="tr" :item-key="key => key" handle=".vtl-thead-column span">-->
<!--                        <template #item="{ element, index }">-->
                    <tr>
                        <th v-for="(element,index) in setting.visibleColumns" :key="index" class="vtl-thead-th" :class="{'with-icon': element.icon}" :style="{ width: element.width ? element.width : 'auto' }">
                            <div class="vtl-thead-column" :class="theadClasses(element)" @click="doSort(element)">
                                <span>{{ element.label }}</span>
                            </div>
                            <div class="filter-field">
                                <div v-if="element.filter">
                                    <input @input="applyFilters" v-model="element.filter.value"/>
                                </div>
                            </div>
                        </th>
                    </tr>
<!--                        </template>-->
<!--                    </draggable>-->
                </thead>

                <tbody>
                    <tr v-if="editing.row" ref="editRow" @wheel.prevent @touchmove.prevent @scroll.prevent :class="{'modal-edit': editing.col.options}" class="vtl-tbody-tr vtl-edit-row" :style="{top: editing.rowPosition}">
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
                    <tr v-else ref="addRow"  class="vtl-tbody-tr vtl-edit-row add-row" :class="{'add-row-before': editing.draggingOverPosition === 'before','add-row-after': editing.draggingOverPosition === 'after'}" :style="{top: editing.rowPosition}">
                        <td v-if="!editing.selectedRows.length" class="active"><button @click="insertRow()" class="add-button">+</button></td>
                    </tr>
                </tbody>

                <transition-group tag="tbody" name="slide" class="vtl-tbody" @click="handleTableClick($event)" @contextmenu="handleTableRightClick($event)">
                    <tr v-for="(element,index) in localRows" :key="element.id">
                        <template v-if="index > minVisibleRow && index < maxVisibleRow">
                            <td v-for="(col, j) in setting.visibleColumns" :key="j" :title="element[col.field]" :style="col.datasource && element[col.field] && styles(col.datasource[element[col.field]])" :class="{handle: j===0}">
                                <img v-if="col.icon && element[col.field]" :src="icon(col.datasource[element[col.field]])"/>
                                <span>{{element[col.field]}}</span>
                            </td>
                        </template>
                    </tr>
                </transition-group>

                <tfoot>
                    <tr>
                        <td colspan="999">
                            <div class="vtl-status">{{editing.tableStatus}}</div>
                        </td>
                    </tr>
                </tfoot>
                <tfoot>
                    <tr :height="editing.expanderSize"></tr>
                </tfoot>
            </table>

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
    <div v-if="view === 'XML'" class="vtl-card-body">
<!--        <pre v-highlightjs><code class="xml">{{xml}}</code></pre>-->
        <pre><code class="xml">{{xml}}</code></pre>
    </div>
    <div>
        <button class="vtl-save" :disabled="view==='XML'" @click="xmlData()">XML</button>
        <button class="vtl-save" :disabled="view==='TABLE'"  @click="tableData()">TABLE</button>
    </div>
</template>

<script>
    import hljs from 'highlight.js'
    import { debounce } from "debounce";
    import {directive, Contextmenu, ContextmenuItem} from "v-contextmenu"
    import {defineComponent, ref, reactive, nextTick } from "vue";
    import "v-contextmenu/dist/themes/dark.css";
    import 'highlight.js/styles/agate.css'

    let collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: "base",
    });

    export default defineComponent({
        directives: {
            highlightjs:  (el, binding) => {
                const codeNodes = el.querySelectorAll('code')

                for (let i = 0; i < codeNodes.length; i++) {
                    const codeNode = codeNodes[i]

                    if (typeof binding.value === 'string') {
                        codeNode.textContent = binding.value
                    }

                    hljs.highlightBlock(codeNode)
                }
            },
            contextmenu: directive,
        },
        components: {
            // draggable,
            [Contextmenu.name]: Contextmenu,
            [ContextmenuItem.name]: ContextmenuItem,
        },
        name: "my-table",
        emits: [
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
            optionsFilter: {
                type: Function,
                default: (item) => true,
            },
            icon: {
                type: Function,
                default: (item) => "",
            },
            save: {
                type: Function,
                default: (rows,cols) => "",
            },
            styles: {
                type: Function,
                default: (item)=> null,
            },
            createRow: {
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
        mounted(){
            this.applyFilters()
            this.handleDebouncedScroll = debounce(this.updateRowsVisibility, 50);
            this.handleDebouncedScrollOptions = debounce(this.updateOptionsVisibility, 50);
            this.$refs.localTable.addEventListener('scroll', this.handleDebouncedScroll);
        },
        methods: {
            tableData(){
                this.view = "TABLE"
            },
            xmlData(){
                let xml = this.save(this.rows, this.columns)

                xml = xml.replace(/>\s+<Field Id="([\w\s]+)"( Index="\d+")?\/>\s+</g,`><Field Id="$1"$2/><`)
                this.view = "XML"
                this.xml = xml
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
            tableDragStart(event){
                //mousedown
                if(!this.dragging.active && !this.dragging.ready){
                    this.dragging.ready = event.clientY
                }
            },
            tableDragMove(event){

                if(event.target.nodeName === 'TBODY' || event.target.nodeName === 'TABLE'){
                    return false
                }
                let tr = event.target; while(tr.nodeName !== 'TR')tr = tr.parentElement;

                if(tr === this.$refs.addRow || tr === this.$refs.editRow){
                    return false;
                }

                let tbody = tr.parentElement;
                let rowIndex = Array.prototype.indexOf.call(tbody.children,tr)



                this.editing.draggingOverPosition = event.offsetY < 20 ? "before" : "after"
                this.editing.draggingOverRowIndex= rowIndex

                if(this.dragging.ready){
                    //dragstart
                    if(Math.abs(this.dragging.ready - event.clientY) > 10){
                        delete this.dragging.ready
                        this.dragging.active = true


                        if(!this.isRowSelected(this.localRows[rowIndex])){
                            this.clearSelection()
                            this.selectRow(this.localRows[rowIndex])
                        }
                    }
                }
                else if(this.dragging.active){
                    //dragmove
                    if(this.dragging.draggingOverPosition === this.editing.draggingOverPosition && tr === this.dragging.draggingOverRow){
                        return
                    }
                    if(this.dragging.draggingOverRow){
                        this.dragging.draggingOverRow.classList.remove('insert-after')
                        this.dragging.draggingOverRow.classList.remove('insert-before')
                    }
                    this.dragging.draggingOverRow = tr
                    this.dragging.draggingOverPosition = this.editing.draggingOverPosition;

                    if(this.isRowSelected(this.localRows[rowIndex])){
                        delete this.dragging.targetIndex
                    }
                    else{
                        this.dragging.targetIndex = rowIndex
                        tr.classList.add('insert-' + this.dragging.draggingOverPosition)
                    }
                }
                else if(!this.editing.row){
                    this.setEditRowPosition(rowIndex)
                }


            },
            tableDragEnd(event){
                //dragcancel
                if(this.dragging.ready) {
                    delete this.dragging.ready
                }

                //dragend
                if(this.dragging.active){
                    if(this.dragging.draggingOverRow){
                        this.dragging.draggingOverRow.classList.remove('insert-after')
                        this.dragging.draggingOverRow.classList.remove('insert-before')
                    }
                    if(this.dragging.targetIndex){
                        let targetRow = this.localRows[this.dragging.targetIndex]

                        for(let row of this.editing.selectedRows){
                            // eslint-disable-next-line vue/no-mutating-props
                            this.rows.splice(this.rows.indexOf(row),1);
                        }

                        if(this.dragging.draggingOverPosition === "before"){
                            // eslint-disable-next-line vue/no-mutating-props
                            this.rows.splice(this.rows.indexOf(targetRow),0,...this.editing.selectedRows);
                        }
                        else{
                            // eslint-disable-next-line vue/no-mutating-props
                            this.rows.splice(this.rows.indexOf(targetRow)+ 1,0,...this.editing.selectedRows);
                        }

                        this.applyFilters();
                    }
                    delete this.dragging.draggingOverRow
                    delete this.dragging.draggingOverPosition;
                    delete this.dragging.active
                    delete this.dragging.targetIndex
                }
            },
            removeRow(row){
                // eslint-disable-next-line vue/no-mutating-props
                this.rows.splice(this.rows.indexOf(row),1);
                this.applyFilters();
            },
            insertRowBefore(){
                let row = this.createRow()
                console.log(this.editing.draggingOverRowIndex)
                // eslint-disable-next-line vue/no-mutating-props
                this.rows.splice(this.editing.draggingOverRowIndex,0,row);
                this.applyFilters();
            },
            insertRowAfter(){
                let row = this.createRow()
                // eslint-disable-next-line vue/no-mutating-props
                this.rows.splice(this.editing.draggingOverRowIndex+ 1,0,row );
                this.applyFilters();
            },
            insertRow(){
                if(this.editing.draggingOverRowIndex){

                    if(this.editing.draggingOverPosition === "before"){
                        this.insertRowBefore()
                    }
                    else {
                        this.insertRowAfter()
                    }
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
                if(this.editing.row){
                    this.editing.row = null
                    this.editing.col = null
                    this.editing.value = null
                }
                else{
                    this.clearSelection()
                }
            },
            applyChanges() {
                //multiple selection
                if(this.editing.selectedRows.includes(this.editing.row)){
                    for(let row of this.editing.selectedRows){
                        row[this.editing.col.field] = this.editing.value
                    }
                }
                else{
                    this.editing.row[this.editing.col.field] = this.editing.value
                }
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
            handleTableRightClick(event) {

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
                if(rowIndex < 0){
                    return false;
                }
                if(this.editing.row) {
                    this.applyChanges()
                }
                if(event.shiftKey && this.editing.lastSelectedRow){
                    let lastSelectedRowIndex = this.localRows.indexOf(this.editing.lastSelectedRow)
                    let rowsToSelect = this.localRows.slice(Math.min(lastSelectedRowIndex,rowIndex),Math.max(lastSelectedRowIndex,rowIndex)+1)
                    this.selectRows(rowsToSelect)
                }
                else if(event.ctrlKey){
                    this.toggleRow(this.localRows[rowIndex])
                }
                else if(colIndex === 0){
                    this.clearSelection()
                    this.selectRow(this.localRows[rowIndex])
                }
                else {
                    if(!this.isRowSelected(this.localRows[rowIndex])){
                        this.clearSelection()
                    }
                    this.selectRow(this.localRows[rowIndex])
                    nextTick(() => {
                        this.editRowCell(rowIndex, colIndex)
                    })
                }
            },
            clearSelection(){
                let selectedRows = this.editing.selectedRows.slice()
                for(let row of selectedRows){
                    this.deselectRow(row)
                }
            },
            selectRows(rows){
                for(let row of rows){
                    this.selectRow(row)
                }
            },
            isRowSelected(row){
                return this.editing.selectedRows.includes(row)
            },
            deselectRow(row){
                let rowIndex = this.localRows.indexOf(row)
                if(this.isRowSelected(row)){
                    this.$refs.localTable.tBodies[1].children[rowIndex].classList.remove("selected")
                    this.editing.selectedRows.splice(this.editing.selectedRows.indexOf(row),1)
                }
                this.lastSelectedRow = null
            },
            selectRow(row){
                let rowIndex = this.localRows.indexOf(row)
                if(!this.isRowSelected(row)){
                    this.$refs.localTable.tBodies[1].children[rowIndex].classList.add("selected")
                    this.editing.selectedRows.push(row)
                }
                this.editing.lastSelectedRow = row
            },
            toggleRow(row){
                if(!this.isRowSelected(row)){
                    this.selectRow(row)
                }
                else{
                    this.deselectRow(row)
                }
            },
            setEditRowPosition(rowIndex){
                let tr  = this.$refs.localTable.tBodies[1].children[rowIndex]
                this.editing.rowPosition = tr.offsetTop + tr.clientHeight + 'px'
            },
            editRowCell(rowIndex,colIndex){
                let row = this.localRows[rowIndex];
                let col = this.setting.visibleColumns[colIndex]
                if(col.editable === false){
                    return
                }
                this.editing.row = row
                this.editing.col = col
                this.editing.columnIndex = colIndex
                this.editing.value = row[col.field]
                this.setEditRowPosition(rowIndex)
                this.filterOptions()
                nextTick(() =>{
                    this.$refs.editRow.children[colIndex].getElementsByTagName("input")[0].focus()
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
                let rect = this.$refs.editRow.children[this.editing.columnIndex].getBoundingClientRect()
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
                let editingValue = this.editing.value?.toLowerCase();
                this.editing.options = this.editing.col.options.filter(option =>{
                    if(option.selectable === false)return false
                    return this.optionsFilter(option,this.editing.col.field) && (!editingValue || option.id.toLowerCase().includes(editingValue))
                })
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
                    if(!this.optionsFilter(row,"tech")){
                        return false
                    }
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
                view: "TABLE",
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
                selectedRows: [],
                lastSelectedRow: null,
                editorTools: false,
                row: null,
                col: null,
                value: null,
                position: {},
                positionClass: ""
            })
            const setting = reactive({
                visibleColumns,
                isCheckAll: false,
                order: props.sortable.order,
                sort: props.sortable.sort
            });
            return {
                dragging: reactive({}),
                columnsWithOptions,
                setting,
                editing,
                tBody: ref  (null),
                localTable: ref  (null),
                addRow: ref  (null),
                editRow: ref  (null),
                optionsList: ref  (null),
                rowCheckbox : ref([])
            }
        }
    })
</script>
