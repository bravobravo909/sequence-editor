const vscode = require('vscode');
const fs = require("fs");
class DecoratorLensProvider {
    provideCodeLenses(document) {
        const lenses = [];
		const colorRegex = /ColorSequence\.new\s*\(/;
		const numberRegex = /NumberSequence\.new\s*\(/; //i hate regex oke?
        for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i).text;

			if (line.match(colorRegex)) {

				const range = new vscode.Range(i,0,i,0);

				lenses.push(
					new vscode.CodeLens(range,{
						title:"🎨 Edit Color Sequence",
						command:"sequence-editor.colorSequence",
						arguments:[i]
					})
				);
			}

			if (line.match(numberRegex)) {

				const range = new vscode.Range(i,0,i,0);

				lenses.push(
					new vscode.CodeLens(range,{
						title:"📈 Edit Number Sequence",
						command:"sequence-editor.numberSequence",
						arguments:[i]
					})
				);
			}
        }
        return lenses;
    }
}

//yes this is AI generated, no i will not be ashamed of it
function parseColorSequence(text){
	const regex = /ColorSequenceKeypoint\.new\s*\(\s*([0-9.]+)\s*,\s*Color3\.fromRGB\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/g;
	const stops = [];
	let match;
	while((match = regex.exec(text))){

		const pos = parseFloat(match[1]);

		const r = parseInt(match[2]);
		const g = parseInt(match[3]);
		const b = parseInt(match[4]);

		const hex =
			"#" +
			[r,g,b]
			.map(x => x.toString(16).padStart(2,"0"))
			.join("");

		stops.push({pos,color:hex});
	}
	return stops;
}

function parseNumberSequence(text){

    const regex = /NumberSequenceKeypoint\.new\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/g;

    const keys = [];

    let match;

    while((match = regex.exec(text))){

        keys.push({
            time:parseFloat(match[1]),
            value:parseFloat(match[2]),
            envelope:parseFloat(match[3])
        });
    }

    return keys;
}

function activate(context) {

    const languages = ["luau", "lua"];
    const provider = new DecoratorLensProvider();

    languages.forEach(lang => {
        context.subscriptions.push(
            vscode.languages.registerCodeLensProvider(
                { language: lang },
                provider
            )
        );
    });
	vscode.commands.registerCommand("sequence-editor.colorSequence", (line) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;
		const doc = editor.document;
		let startLine = line;
		let startChar = 0;
		const startText = doc.lineAt(startLine).text;
		const startIndex = startText.indexOf("ColorSequence.new");
		if (startIndex !== -1) {
			startChar = startIndex;
		}
		let depth = 0;
		let started = false;
		let endLine = startLine;
		let endChar = 0;
		for (let i = startLine; i < doc.lineCount; i++) {
			const text = doc.lineAt(i).text;
			for (let j = 0; j < text.length; j++) {
				const char = text[j];
				if (char === "(") {
					depth++;
					started = true;
				}
				if (char === ")") {
					depth--;
				}
				if (started && depth === 0) {
					endLine = i;
					endChar = j + 1;
					break;
				}
			}
			if (started && depth === 0) break;
		}
		const range = new vscode.Range(startLine, startChar, endLine, endChar);
		const panel = vscode.window.createWebviewPanel(
			"gradientPicker",
			"Gradient Picker",
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: false
			}
		);
		const htmlPath = vscode.Uri.joinPath(
			context.extensionUri,
			"gradientEditor",
			"gradient.html"
		);
		let html = fs.readFileSync(htmlPath.fsPath, "utf8");
		const cssUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, "gradientEditor", "gradient.css")
		);
		const jsUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, "gradientEditor", "gradient.js")
		);
		html = html
			.replace("gradient.css", cssUri)
			.replace("gradient.js", jsUri);

		const sequenceText = editor.document.getText(range);
		const stops = parseColorSequence(sequenceText);

		const stopsJSON = JSON.stringify(stops);

		html = `
		<script>
		window.initialStops = ${stopsJSON};
		</script>
		` + html; //bruh whattt???

		panel.webview.html = html;

		panel.webview.onDidReceiveMessage(message => {
			if (message.type === "applyColorSequence") {
				const text = doc.getText(range);

				if (text.includes("ColorSequence.new")) {
					editor.edit(edit => {
						edit.replace(range, message.value);
					});
				}
				panel.dispose();

			}
		});

	});


	vscode.commands.registerCommand("sequence-editor.numberSequence",(line)=>{

		const editor = vscode.window.activeTextEditor;
		if(!editor) return;

		const doc = editor.document;

		let startLine = line;
		let startChar = 0;

		const startText = doc.lineAt(startLine).text;

		const startIndex = startText.indexOf("NumberSequence.new");

		if(startIndex !== -1){
			startChar = startIndex;
		}

		let depth = 0;
		let started = false;

		let endLine = startLine;
		let endChar = 0;

		for(let i=startLine;i<doc.lineCount;i++){

			const text = doc.lineAt(i).text;

			for(let j=0;j<text.length;j++){

				const char = text[j];

				if(char==="("){
					depth++;
					started=true;
				}

				if(char===")"){
					depth--;
				}

				if(started && depth===0){
					endLine=i;
					endChar=j+1;
					break;
				}
			}

			if(started && depth===0) break;
		}

		const range = new vscode.Range(startLine,startChar,endLine,endChar);

		const panel = vscode.window.createWebviewPanel(
			"sequenceEditor",
			"Number Sequence Editor",
			vscode.ViewColumn.Two,
			{ enableScripts:true }
		);

		const htmlPath = vscode.Uri.joinPath(
			context.extensionUri,
			"sequenceEditor",
			"sequence.html"
		);

		let html = fs.readFileSync(htmlPath.fsPath,"utf8");

		const cssUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri,"sequenceEditor","sequence.css")
		);

		const jsUri = panel.webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri,"sequenceEditor","sequence.js")
		);

		html = html
			.replace("sequence.css",cssUri)
			.replace("sequence.js",jsUri);

		const sequenceText = editor.document.getText(range);

		const keys = parseNumberSequence(sequenceText);

		const keysJSON = JSON.stringify(keys);

		html = `
		<script>
		window.initialKeys = ${keysJSON};
		</script>
		` + html;

		panel.webview.html = html;

		panel.webview.onDidReceiveMessage(message=>{

			if(message.type==="applyNumberSequence"){

				const text = doc.getText(range);

				if(text.includes("NumberSequence.new")){
					editor.edit(edit=>{
						edit.replace(range,message.value);
					});
				}

				panel.dispose();
			}
		});
	});
}



function deactivate() {}

module.exports = {
    activate,
    deactivate
};