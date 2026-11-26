// Runs captured source functions in an isolated VM with a display-only jQuery stub.
const fs=require('node:fs'),vm=require('node:vm');
const source=JSON.parse(fs.readFileSync(__dirname+'/source-excerpts.json','utf8'));
const display={val:()=>5,html:()=>display,removeClass:()=>display,addClass:()=>display,css:()=>display};const jq=()=>display;
const context={$:jq,addCommas:String};vm.createContext(context);
vm.runInContext(source.fv+source.education_constants+source.education_defaults,context);
vm.runInContext(`var rencanaPendidikan={sd:{uangPangkal:10000000,SPP:1000000,biayaLain:10,sppMultiplier:12},smp:{uangPangkal:20000000,SPP:2000000,biayaLain:5,sppMultiplier:12},sma:{uangPangkal:30000000,SPP:3000000,biayaLain:10,sppMultiplier:12},s1:{uangPangkal:40000000,SPP:10000000,biayaLain:10,sppMultiplier:2}};var usiaAnak=3,inflasiBiayaPendidikan=5;var totalBiayaKeseluruhan={sd:{breakdown:{}},smp:{breakdown:{}},sma:{breakdown:{}},s1:{breakdown:{}}};`,context);
vm.runInContext(source.education_table+';buildTable();referenceEducation=totalBiayaKeseluruhan;',context);
vm.runInContext(`var venue=30000000,mc=2000000,wo=5000000,makeup=3000000,pakaian=4000000,mahar=10000000,dokumentasi=6000000,music=2000000,dekorasi=5000000,etc=1000000,countCatering=200,priceCatering=100000,countSouvenir=100,priceSouvenir=20000,countInvitation=100,priceInvitation=10000,targetTahun=2;`,context);
vm.runInContext(source.wedding_total+';countTotal();referenceWedding=totalPost;',context);
vm.runInContext(`referenceFV=[-FV(.06/12,60,1000000,5000000,1),-FV(.06,19,12000000,5000000,1),-FV(0,12,10,100,0)];`,context);
vm.runInContext('var targetNominal=100000000,targetTahun=5,targetInvestasi=1000000,uangSekarang=0;',context);
vm.runInContext(source.return_search+';referenceReturn=generateReturnRecommendation(5,6,-FV(.06/12,60,1000000,0,1));',context);
vm.runInContext('var penghasilanOrangTua=15000000,danaTerkumpul=5000000,canBeOptimized=true,optimalRecommendation={};',context);
vm.runInContext(source.education_optimizer+';buildRecommendation(1000000,6,3,-FV(.06,3,12000000,5000000,1),104417775,\'sd\');referenceOptimal=optimalRecommendation.sd;',context);
vm.runInContext(`referenceOptimizerCases=[];for(const income of [0,3000000,15000000,60000000]){for(const years of [0,3,8]){penghasilanOrangTua=income;danaTerkumpul=5000000;buildRecommendation(1000000,6,years,-FV(.06,years,12000000,5000000,1),104417775,'sd');referenceOptimizerCases.push({income,years,...optimalRecommendation.sd});}}`,context);
const archiveCases=[];
for(const kind of ['properti','kendaraan','menikah']){
 vm.runInContext(source.nominal_archive[kind],context);
 for(const years of [1,5,10]) for(const rate of [0,6,15]) for(const payment of [0,1000000,20000000]){
  Object.assign(context,{totalPost:150000000*1.05**years,targetNominal:150000000*1.05**years,targetTahun:years,targetInvestasi:payment,uangSekarang:5000000});
  const result=vm.runInContext(`generateNominalRecommendation(targetInvestasi,-FV(${rate}/1200,targetTahun*12,targetInvestasi,uangSekarang,1))`,context);
  archiveCases.push({kind,years,rate,input_payment:payment,...result});
 }
}
console.log(JSON.stringify({archive_cases:archiveCases,education:context.referenceEducation,wedding:context.referenceWedding,fv:context.referenceFV,return_search:context.referenceReturn,optimal:context.referenceOptimal,optimizer_cases:context.referenceOptimizerCases}));
