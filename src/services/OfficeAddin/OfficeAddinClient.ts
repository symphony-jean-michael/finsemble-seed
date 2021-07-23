import * as CONSTANTS from "./config/const";
import ExcelAction from "./types/ExcelAction";
import ExcelActionResult from "./types/ExcelActionResult";
import ExcelFile from "./types/ExcelFile";
import ExcelWorksheet from "./types/ExcelWorksheet";

export default class OfficeAddinClient {
	#FSBL: typeof FSBL;

	activeExcelFiles: Array<ExcelFile> = [];
	previousExcelFiles: Array<ExcelFile> = [];
  	excelActions: Array<ExcelAction> = [];

	constructor(Finsemble?: typeof FSBL) {
		console.log("Initializing OfficeAddinClient")
		this.#FSBL = window.FSBL || Finsemble;

		this.registerExcelAction.bind(this)
		this.registerExcelAction({action: CONSTANTS.GET_ACTIVE_EXCEL_FILES}).then((actions)=>{
			this.#FSBL.Clients.RouterClient.query(actions[0].id, {}, (err, res) => {
				this.activeExcelFiles = res.data.data
				console.log("OfficeAddinClient.GET_ACTIVE_EXCEL_FILES", this.activeExcelFiles);
			})
		})

		this.registerExcelAction({action: CONSTANTS.SUBSCRIBE_ACTIVE_EXCEL_FILES_CHANGE}).then((actions)=>{
			this.#FSBL.Clients.RouterClient.addListener(actions[0].id, this.onActiveExcelFilesChanged.bind(this));
			this.#FSBL.Clients.WindowClient.getComponentState({ field: 'previousExcelFiles' }, this.handleGetPreviousExcelFilesFromComponentState.bind(this))
			
			window.dispatchEvent(new Event('OfficeAddinClientReady'));
		})

		this.searchExcelActions.bind(this)
		this.queryOfficeAddinService.bind(this)

		this.getActiveExcelFiles.bind(this)
		this.getPreviousExcelFiles.bind(this)
		this.getWorksheetList.bind(this)
		this.setActiveWorksheet.bind(this)
		this.getActiveWorksheet.bind(this)
		this.createWorksheet.bind(this)
		this.deleteWorksheet.bind(this)
		this.getExcelRange.bind(this)
		this.setExcelRange.bind(this)
		this.focusExcelRange.bind(this)
		this.clearExcelRange.bind(this)
		this.saveExcelWorkbook.bind(this)
		this.onActiveExcelFilesChange.bind(this)
		this.onSheetSelectionChanged.bind(this)
		this.onSheetValueChanged.bind(this)
	}

	/*--- Functions for internal use---*/

	registerExcelAction (params:{action: string, excelFiles?: Array<ExcelFile>, worksheet?: ExcelWorksheet, range?: string}, cb?): Promise<any> {
		return new Promise<{}>(async (resolve, reject) => {
			console.log("OfficeAddinClient.registerExcelAction", params);
			try{
				this.#FSBL.Clients.RouterClient.query(CONSTANTS.OFFICE_ADDIN_REGISTER, { actions: [params.action], excelFiles: params.excelFiles, worksheet:params?.worksheet, range: params?.range}, (err, res) => {
					if(err){
						this.#FSBL.Clients.Logger.error("OfficeAddinClient.registerExcelAction failed", err)
						reject(err);
					} else {
						if(res.data.status == 'success'){
							res.data.data.forEach((action)=>{
								this.excelActions.push(action)
							})
							if (cb) {
								cb(null, res.data.data);
							}
							resolve(res.data.data)
						}
					}
				});
			} catch (e) {
				this.#FSBL.Clients.Logger.error("OfficeAddinClient.registerExcelAction failed", e)
				if (cb) {
					cb(e);
				}
				reject(e);
			}
		})
	}

	onActiveExcelFilesChanged (err, res) {
		if(err){
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.onActiveExcelFilesChanged failed", err)
		} else {
			this.activeExcelFiles = res.data.ACTIVE_EXCEL_FILES
			this.#FSBL.Clients.WindowClient.getComponentState({ field: 'previousExcelFiles' }, this.handleGetPreviousExcelFilesFromComponentState.bind(this))
			console.log("OfficeAddinClient.onActiveExcelFilesChanged", this.activeExcelFiles)
		}
	}
	

	handleGetPreviousExcelFilesFromComponentState(err, previousExcelFiles: Array<ExcelFile>) {
		if(err){
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.getComponentState previousExcelFiles failed", err)
		} else {
			if (previousExcelFiles) {
				// Compare with previous excel file list to see if matches
				this.activeExcelFiles.forEach((tempExcelFile: ExcelFile, index: number) => {
					let matchExcelFile = previousExcelFiles.find((previousExcelFile: ExcelFile, index) => {
						if (previousExcelFile.fileName === tempExcelFile.fileName) {
							// if matched, updated the file
							previousExcelFiles[index] = tempExcelFile
						}
						return previousExcelFile.fileName === tempExcelFile.fileName
					})
					if (!matchExcelFile) {
						// if not match add to previous files
						previousExcelFiles.push(tempExcelFile)
					}
				})
				// Save the previous excel files to component state
				this.#FSBL.Clients.WindowClient.setComponentState({ field: 'previousExcelFiles', value: previousExcelFiles })
				// Dispatch previous excel file to redux store
			} else {
				// If no previous excel files
				this.#FSBL.Clients.WindowClient.setComponentState({ field: 'previousExcelFiles', value: this.activeExcelFiles })
			}
			this.previousExcelFiles = previousExcelFiles
			console.log("OfficeAddinClient.handleGetPreviousExcelFiles", this.previousExcelFiles)
		}
	}

	searchExcelActions(action, fileName){
		return this.excelActions.filter((excelAction: ExcelAction) => {
			return excelAction.action === action && excelAction.file?.fileName === fileName
		})
	}

	queryOfficeAddinService(action, params): Promise<any> {
		return new Promise<{}>(async (resolve, reject) => {
			let tempActions = this.searchExcelActions(action, params.excelFile.fileName)
			if (tempActions.length > 0) {
				tempActions.forEach((tempAction: ExcelAction) => {
					this.#FSBL.Clients.RouterClient.query(tempAction.id, params, (err, res) => {
						if(err){
							reject(err)
						} else {
							if (res.data) {
								resolve(res.data)
							}
						}
					})
				})
			} else {
				this.registerExcelAction({action: action, excelFiles:[params.excelFile]}).then((actions)=>{
					this.queryOfficeAddinService(action, params).then((result)=>{
						resolve(result)
					})
				})
			}
		})
	}


	/*--- Functions for external use ---*/

	getActiveExcelFiles(){
		return this.activeExcelFiles
	}

	getPreviousExcelFiles(){
		return this.previousExcelFiles
	}
            
	// FSBL.Clients.OfficeAddinClient.getWorksheetList({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0]}).then((worksheetList)=>{console.log(worksheetList)})
	async getWorksheetList (params: {excelFile: ExcelFile}, cb?): Promise<Array<ExcelWorksheet>> {
		console.log("OfficeAddinClient.getWorksheetList", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.GET_WORKSHEET_LIST, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.geWorksheetList failed", e)
			if (cb) {
				cb(e);
			}
			throw e ;
		}
	}

	// FSBL.Clients.OfficeAddinClient.getExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A1:C3"}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.getExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A1:C3", worksheet:{name:"Sheet1"}}).then((values)=>{console.log(values)}
	async getExcelRange(params:{ excelFile: ExcelFile, range: string, worksheet?: ExcelWorksheet }, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.getExcelRange", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.GET_EXCEL_RANGE, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;
				});
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.getExcelRange failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}  

	// FSBL.Clients.OfficeAddinClient.setExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A4:C6", values:[["A4","B4","C4"],["A5","B5","C5"],["A6","B6","C6"]]}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.setExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A4:C6", values:[["A4","B4","C4"],["A5","B5","C5"],["A6","B6","C6"]], worksheet:{name:"Sheet2"}}).then((values)=>{console.log(values)})
	async setExcelRange(params:{ excelFile: ExcelFile, range: string, worksheet?: ExcelWorksheet, values: Array<Array<string>> }, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.setExcelRange", params);
		try{
			let startCell = params.range.split(':')[0]
            let endCell = params.range.split(':')[1]
            let targetColNum = convertExcelColToNum(strRemoveNum(endCell)) - convertExcelColToNum(strRemoveNum(startCell)) + 1
            let targetRowNum = strRemoveChar(endCell) - strRemoveChar(startCell) + 1
            let targetRange = params.range
            if (params.values.length != targetRowNum || params.values[0].length != targetColNum) {
                if (!strRemoveChar(startCell)) {
                    startCell += '1'
                }
                let targetEndCell = ''
                if (params.values[0].length > 0) {
                    targetEndCell = convertNumToExcelCol(convertExcelColToNum(strRemoveNum(startCell)) - 1 + params.values[0].length - 1) + (params.values.length - 1 + strRemoveChar(startCell))
                }
                targetRange = startCell + ':' + targetEndCell
				params.range = targetRange
            }

			return this.queryOfficeAddinService(CONSTANTS.SET_EXCEL_RANGE, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.setExcelRange failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.focusExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A4:C6"}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.focusExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A4:C6", worksheet:{name:"Sheet1"}}).then((values)=>{console.log(values)})
	async focusExcelRange(params:{ excelFile: ExcelFile, range: string, worksheet?: ExcelWorksheet }, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.focusExcelRange", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.FOCUS_EXCEL_RANGE, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.focusExcelRange failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.clearExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A4:C6"}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.clearExcelRange({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], range:"A4:C6", worksheet:{name:"Sheet1"}}).then((values)=>{console.log(values)})
	async clearExcelRange(params:{ excelFile: ExcelFile, range: string, worksheet?: ExcelWorksheet }, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.clearExcelRange", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.CLEAR_EXCEL_RANGE, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.clearExcelRange failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

    // FSBL.Clients.OfficeAddinClient.saveExcelWorkbook({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0]}).then((values)=>{console.log(values)})
	async saveExcelWorkbook(params:{ excelFile: ExcelFile}, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.saveExcelWorkbook", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.SAVE_EXCEL_WORKBOOK, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.saveExcelWorkbook failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.getActiveWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0]}).then((values)=>{console.log(values)})
	async getActiveWorksheet(params:{ excelFile: ExcelFile}, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.getActiveWorksheet", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.GET_ACTIVE_WORKSHEET, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;		
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.getActiveWorksheet failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.setActiveWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], worksheet:{name:"Sheet2"}}).then((values)=>{console.log(values)})
	async setActiveWorksheet(params:{ excelFile: ExcelFile}, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.setActiveWorksheet", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.SET_ACTIVE_WORKSHEET, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;				
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.setActiveWorksheet failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.createWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], worksheet:{name:"Sheet3"}}).then((values)=>{console.log(values)})
	async createWorksheet(params:{ excelFile: ExcelFile}, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.createWorksheet", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.CREATE_WORKSHEET, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;		
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.createWorksheet failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.deleteWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], worksheet:{name:"Sheet3"}}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.deleteWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0]}).then((values)=>{console.log(values)})
	async deleteWorksheet(params:{ excelFile: ExcelFile}, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.deleteWorksheet", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.DELETE_WORKSHEET, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;		
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.deleteWorksheet failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.hideWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0]}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.hideWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], worksheet:{name:"Sheet2"}}).then((values)=>{console.log(values)})
	async hideWorksheet(params:{ excelFile: ExcelFile}, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.hideWorksheet", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.HIDE_WORKSHEET, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;	
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.hideWorksheet failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

    // FSBL.Clients.OfficeAddinClient.unhideWorksheet({excelFile: FSBL.Clients.OfficeAddinClient.getActiveExcelFiles()[0], worksheet:{name:"Sheet2"}}).then((values)=>{console.log(values)})
	async unhideWorksheet(params:{ excelFile: ExcelFile}, cb?): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.unhideWorksheet", params);
		try{
			return this.queryOfficeAddinService(CONSTANTS.UNHIDE_WORKSHEET, params)
				.then((result)=>{
					if(cb){
						cb(null, result.data);
					}
					return result.data;					
				})
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.unhideWorksheet failed", e)
			if (cb) {
				cb(e);
			}
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.onActiveExcelFilesChange({}, (res)=>{ console.log(err, res.activeExcelFiles)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onActiveExcelFilesChange({excelFiles: [{fileName:"test1.xlsx"}]}, (res)=>{ console.log(res.changedFile, res.activeExcelFiles)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onActiveExcelFilesChange({excelFiles: [{fileName:"test1.xlsx"},{fileName:"test2.xlsx"}]}, (res)=>{ console.log(res.changedFile, res.activeExcelFiles)}).then((values)=>{console.log(values)})
	async onActiveExcelFilesChange(params:{ excelFiles: Array<ExcelFile>}, eventHandler): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.onActiveExcelFilesChange", params);
		try{
			this.registerExcelAction({action: CONSTANTS.SUBSCRIBE_ACTIVE_EXCEL_FILES_CHANGE, excelFiles:params.excelFiles}).then((actions)=>{
				actions.forEach((action)=>{
					this.#FSBL.Clients.RouterClient.addListener(action.id, (err, res)=>{
						if(!err)
							eventHandler({activeExcelFiles: res.data.ACTIVE_EXCEL_FILES, changedFile: res.data.changedFile})
						else 
							this.#FSBL.Clients.Logger.error("OfficeAddinClient.onActiveExcelFilesChange failed", err)
					});
				})
			})
			return {action: CONSTANTS.SUBSCRIBE_ACTIVE_EXCEL_FILES_CHANGE, result:"DONE"}
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.onActiveExcelFilesChange failed", e)
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.onSheetSelectionChanged({}, (values)=>{ console.log(values)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetSelectionChanged({excelFiles: [{fileName:"test1.xlsx"}]}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetSelectionChanged({excelFiles: [{fileName:"test1.xlsx"}], worksheet:{name:"Sheet1"}}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetSelectionChanged({excelFiles: [{fileName:"test1.xlsx"}], worksheet:{name:"Sheet1"}, range:"A1:C3"}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	async onSheetSelectionChanged(params:{ excelFiles: Array<ExcelFile>, worksheet?:ExcelWorksheet, range?: string}, eventHandler): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.onSheetSelectionChanged", params);
		try{
			this.registerExcelAction({action: CONSTANTS.SUBSCRIBE_SHEET_SELECTION_CHANGE, excelFiles:params.excelFiles, worksheet: params.worksheet, range: params.range}).then((actions)=>{
				actions.forEach((action)=>{
					this.#FSBL.Clients.RouterClient.addListener(action.id, (err, res)=>{
						if(!err)
							eventHandler({excelFile: res.data.excelFile, worksheet: res.data.eventObj.worksheet, range: res.data.eventObj.range})
						else 
							this.#FSBL.Clients.Logger.error("OfficeAddinClient.onSheetSelectionChanged failed", err)
					});
				})
			})
			return {action: CONSTANTS.SUBSCRIBE_SHEET_SELECTION_CHANGE, result:"DONE"}
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.onSelectionChanged failed", e)
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.onSheetValueChanged({}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetValueChanged({excelFiles: [{fileName:"test1.xlsx"}]}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetValueChanged({excelFiles: [{fileName:"test1.xlsx"}], worksheet:{name:"Sheet1"}}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetValueChanged({excelFiles: [{fileName:"test1.xlsx"}], worksheet:{name:"Sheet1"}, range:"A1:C3"}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	async onSheetValueChanged(params:{ excelFiles: Array<ExcelFile>, worksheet?:ExcelWorksheet, range?: string}, eventHandler): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.onValueChanged", params);
		try{
			this.registerExcelAction({action: CONSTANTS.SUBSCRIBE_SHEET_VALUE_CHANGE, excelFiles:params.excelFiles, worksheet: params.worksheet, range: params.range}).then((actions)=>{
				actions.forEach((action)=>{
					this.#FSBL.Clients.RouterClient.addListener(action.id, (err, res)=>{
						if(!err)
							eventHandler({excelFile: res.data.excelFile, worksheet: res.data.eventObj.worksheet, range: res.data.eventObj.range, details: res.data.eventObj.details})
						else 
							this.#FSBL.Clients.Logger.error("OfficeAddinClient.onSheetSelectionChanged failed", err)
					});
				})
			})
			return {action: CONSTANTS.SUBSCRIBE_SHEET_VALUE_CHANGE, result:"DONE"}
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.onValueChanged failed", e)
			throw e;
		}
	}

	// FSBL.Clients.OfficeAddinClient.onSheetBroadcastValues({}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetBroadcastValues({excelFiles: [{fileName:"test1.xlsx"}]}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetBroadcastValues({excelFiles: [{fileName:"test1.xlsx"}], worksheet:{name:"Sheet1"}}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	// FSBL.Clients.OfficeAddinClient.onSheetBroadcastValues({excelFiles: [{fileName:"test1.xlsx"}], worksheet:{name:"Sheet1"}, range:"A1:C3"}, (event)=>{ console.log(event)}).then((values)=>{console.log(values)})
	async onSheetBroadcastValues(params:{ excelFiles: Array<ExcelFile>, worksheet?:ExcelWorksheet, range?: string}, eventHandler): Promise<ExcelActionResult> {
		console.log("OfficeAddinClient.onSheetBroadcastValues", params);
		try{
			this.registerExcelAction({action: CONSTANTS.SUBSCRIBE_SHEET_BROADCAST_VALUES, excelFiles:params.excelFiles, worksheet: params.worksheet, range: params.range}).then((actions)=>{
				actions.forEach((action)=>{
					this.#FSBL.Clients.RouterClient.addListener(action.id, (err, res)=>{
						if(!err)
							eventHandler({excelFile: res.data.excelFile, worksheet: res.data.eventObj.worksheet, range: res.data.eventObj.range, values: res.data.eventObj.values, params: res.data.eventObj.params})
						else 
							this.#FSBL.Clients.Logger.error("OfficeAddinClient.onSheetSelectionChanged failed", err)
					});
				})
			})
			return {action: CONSTANTS.SUBSCRIBE_SHEET_BROADCAST_VALUES, result:"DONE"}
		} catch (e) {
			this.#FSBL.Clients.Logger.error("OfficeAddinClient.onSheetBroadcastValues failed", e)
			throw e;
		}
	}

	openExcelFile(excelFile: ExcelFile){
		FSBL.Clients.LauncherClient.spawn('Excel', { arguments: `${excelFile.filePath} /x /a FinsembleExcel` });
	}
}


const convertNumToExcelCol = (n: number) => {
	var ordA = 'a'.charCodeAt(0);
	var ordZ = 'z'.charCodeAt(0);
	var len = ordZ - ordA + 1;

	var s = "";
	while (n >= 0) {
		s = String.fromCharCode(n % len + ordA) + s;
		n = Math.floor(n / len) - 1;
	}
	return s.toUpperCase();
}

const convertExcelColToNum = (val: string) => {
	var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j, result = 0;

	for (i = 0, j = val.length - 1; i < val.length; i += 1, j -= 1) {
		result += Math.pow(base.length, j) * (base.indexOf(val[i]) + 1);
	}

	return result;
};

const strRemoveNum = (str: string) => {
	return str.replace(/[0-9]/g, '');
}

const strRemoveChar = (str: string) => {
	return parseInt(str.replace(/^\D+/g, ''));
}
