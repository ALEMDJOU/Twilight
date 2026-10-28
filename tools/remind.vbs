' Lance tools/remind.js sans afficher de fenêtre (utilisé par le Planificateur de tâches Windows).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
node = WScript.Arguments(0)
CreateObject("WScript.Shell").Run """" & node & """ """ & dir & "\remind.js""", 0, False
