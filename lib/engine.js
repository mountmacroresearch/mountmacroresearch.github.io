/* Pure arithmetic shared by the UI and the small financial correctness tests. */
const Engine = (() => {
  const CONTRACTS = {MES:{multiplier:5,tick:.25}, ES:{multiplier:50,tick:.25}};
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  function calculate(rows, settings, trades={}) {
    const {multiplier,tick} = CONTRACTS[settings.contract];
    const capital = settings.capital;
    let pnl=0, costs=0, peak=capital, maxDrawdown=0, count=0, wins=0, gross=0, missing=0;
    let profit=0, loss=0, hits=0, settled=0;
    const base = rows.find(r => finite(r.spxOpen))?.spxOpen;
    const daily = rows.map(r => {
      if(r.official && r.hit!==null && r.hit!==undefined) {settled++;hits+=Number(r.hit);}
      let side=0, entry=null, exit=null, fee=0, slip=0, net=0, g=0, reason='';
      if(settings.mode==='actual') {
        const t=trades[r.date];
        if(t){side=t.side==='long'?1:-1;entry=t.entry;exit=t.exit;fee=t.fees;
          g=side*(exit-entry)*CONTRACTS[t.contract].multiplier;net=g-fee;reason='已导入实际成交';}
        else {net=null;g=null;missing++;reason='未录入成交';}
      } else if(!r.official) { reason='研究记录，不计交易'; }
      else if(r.spyClose===null) { net=null;g=null;reason='待结算'; }
      else if(settings.policy==='framework' && r.action==='no_trade') {reason='框架空仓';}
      else {
        side=settings.policy==='framework' ? ({long:1,buy:1,short:-1,sell:-1}[r.action]||0) : (r.direction==='up'?1:r.direction==='down'?-1:0);
        entry=settings.basis==='futures'?r.futuresOpen:r.spxOpen;
        exit=settings.basis==='futures'?r.futuresClose:r.spxClose;
        if(!side) {reason='无交易方向';}
        else if(!finite(entry)||!finite(exit)) {net=null;g=null;missing++;reason='缺少行情，未计收益';}
        else {g=side*(exit-entry)*multiplier;fee=2*settings.fee;slip=2*settings.slippage*tick*multiplier;net=g-fee-slip;reason='按预测方向模拟';}
      }
      const traded=side!==0 && finite(net);
      if(traded){count++;wins+=Number(net>0);costs+=fee+slip;gross+=g;profit+=Math.max(0,net);loss+=Math.max(0,-net);}
      pnl+=net??0;
      const equity=capital+pnl;peak=Math.max(peak,equity);
      const dd=peak>0?(equity/peak-1)*100:0;maxDrawdown=Math.min(maxDrawdown,dd);
      const benchmark=base && finite(r.spxClose)?(r.spxClose/base-1)*100:null;
      return {...r,side,entry,exit,fee,slip,gross:g,net,traded,reason,pnl,equity,returnPct:pnl/capital*100,drawdown:dd,benchmark,
        benchmarkPnl:benchmark===null?null:capital*benchmark/100};
    });
    return {daily,pnl,costs,gross,count,wins,missing,hits,settled,winRate:count?wins/count*100:null,
      hitRate:settled?hits/settled*100:null,returnPct:pnl/capital*100,maxDrawdown,
      profitFactor:loss?profit/loss:profit?Infinity:null,benchmark:daily.at(-1)?.benchmark??null};
  }
  // A deliberately small CSV contract: one closed, one-contract trade per date.
  function parseTrades(text) {
    const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean);
    const header=lines.shift()?.trim().toLowerCase();
    if(header!=='date,contract,side,entry,exit,fees') throw new Error('表头需为 date,contract,side,entry,exit,fees');
    const result={};
    lines.forEach((line,i)=>{
      const [date,contract,side,e,x,f,...extra]=line.split(',').map(s=>s.trim());
      const entry=Number(e),exit=Number(x),fees=Number(f),code=contract?.toUpperCase();
      if(extra.length || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !CONTRACTS[code] || !['long','short'].includes(side) ||
        ![e,x,f].every(v=>v!==undefined&&v!=='') || ![entry,exit,fees].every(Number.isFinite)||entry<=0||exit<=0||fees<0)
        throw new Error(`第 ${i+2} 行格式不正确；金额须为数字，合约为 MES/ES，方向为 long/short。`);
      if(result[date]) throw new Error(`${date} 重复；每个交易日只录入一笔完整的一手交易。`);
      result[date]={date,contract:code,side,entry,exit,fees};
    });
    if(!Object.keys(result).length) throw new Error('文件没有成交记录。');
    return result;
  }
  return {calculate,parseTrades,CONTRACTS};
})();
if(typeof module!=='undefined') module.exports=Engine;
