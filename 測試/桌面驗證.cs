using AquariusLang.Desktop;
using AquariusLang.Desktop.Application;
using AquariusLang.runtime;
using AquariusLang.Compiler;
using AquariusLang.Object;
using AquariusLang.Wasm;
var 專案=Path.GetFullPath(args[0]);
var 資料根=Path.Combine(專案,"測試","結果","隔離桌面資料");
Directory.CreateDirectory(資料根);
Directory.SetCurrentDirectory(專案);
using var 內建=new DesktopBuiltins(new DesktopApplicationHost("KanbanVerification",storageRoot:資料根));
var 入口=Path.Combine(專案,"測試","桌面驗證.aqua");
內建.NewDefaultBuiltins(入口);
var 原始碼=Directory.GetFiles(專案,"*.aqua").ToDictionary(檔=>Path.GetFileName(檔),File.ReadAllText);
原始碼["桌面驗證.aqua"]=File.ReadAllText(入口);
var 程式=new WasmCompiler().Compile(原始碼.ToDictionary(項=>項.Key,項=>new LoweringCompiler().Compile(項.Value)),"桌面驗證.aqua");
using var 執行=new WasmRuntime(內建,new AquariusLang.Desktop.runtime.WasmtimeEngine());
var 原匯入=內建.BuiltinFuncs["匯入"];
var 匯入函式=new BuiltinObj(參數=>{
    if(參數.Length!=1||參數[0] is not StringObj 名稱||!原始碼.ContainsKey(名稱.Value))return 原匯入.Fn(參數);
    var 範圍=AquariusLang.Object.Environment.NewEnvironment();
    var 匯入結果=執行.Execute(程式,範圍,名稱.Value);
    return 匯入結果 is ErrorObj?匯入結果:new ModuleObj(範圍);
});
內建.BuiltinFuncs["匯入"]=匯入函式;內建.BuiltinFuncs["import"]=匯入函式;
var 結果=執行.Execute(程式,AquariusLang.Object.Environment.NewEnvironment());
if(結果 is ErrorObj 錯誤){Console.Error.WriteLine(錯誤.Message);return 1;}
return 結果 is IntegerObj 數值 ? 數值.Value : 1;
