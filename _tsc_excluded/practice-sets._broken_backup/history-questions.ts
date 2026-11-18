// 题库
export const historyQuestions = [
{
    id: 'his-7a-1-1', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡锛氫腑鍥藉鍐呮棭鏈熶汉绫讳笌鏂囨槑鐨勮捣婧?, edition: '浜烘暀鐗?, section: '绗?璇?涓浗澧冨唴鏃╂湡浜虹被鐨勪唬琛ㄢ€斺€斿寳浜汉',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p1' },
    knowledgePoints: [
      { id: 'yuanmou', title: '鍏冭皨浜?, content: '璺濅粖绾?70涓囧勾锛屾槸鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫汇€? },
      { id: 'beijing', title: '鍖椾含浜?, content: '璺濅粖绾?0涓団€?0涓囧勾锛屽彂鐜颁簬鍖椾含鍛ㄥ彛搴楋紝浼氫娇鐢ㄧ伀锛屼繚瀛樼伀绉嶃€? },
      { id: 'shanding', title: '灞遍《娲炰汉', content: '璺濅粖绾?涓囧勾锛屾帉鎻＄（鍏夊拰閽诲瓟鎶€鏈紝鏈夊缇庤蹇点€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'yuanmou', prompt: '鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫绘槸锛?, options: ['鍏冭皨浜?, '鍖椾含浜?, '灞遍《娲炰汉', '鍗婂潯浜?], answerIndex: 0, explanation: '绠€鍗曪細鍏冭皨浜鸿窛浠婄害170涓囧勾銆? },
      { id: 'q2', knowledgePointId: 'beijing', prompt: '鍖椾含浜虹敓娲诲湪璺濅粖绾﹀灏戝勾锛?, options: ['170涓囧勾', '70涓団€?0涓囧勾', '3涓囧勾', '7000骞?], answerIndex: 1, explanation: '绠€鍗曪細鍖椾含浜鸿窛浠婄害70涓団€?0涓囧勾銆? },
      { id: 'q3', knowledgePointId: 'beijing', prompt: '鍖椾含浜哄凡缁忎細浣跨敤锛?, options: ['鐏?, '鏂囧瓧', '闄跺櫒', '閾佸櫒'], answerIndex: 0, explanation: '绠€鍗曪細鍖椾含浜轰細浣跨敤鐏紝淇濆瓨鐏銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'beijing', prompt: '鍖椾含浜哄彂鐜颁簬鍝噷锛?, options: ['浜戝崡鍏冭皨', '鍖椾含鍛ㄥ彛搴?, '闄曡タ瑗垮畨', '娴欐睙浣欏'], answerIndex: 1, explanation: '涓瓑锛氬寳浜汉鍙戠幇浜庡寳浜懆鍙ｅ簵銆? },
      { id: 'q5', knowledgePointId: 'shanding', prompt: '灞遍《娲炰汉鎺屾彙浜嗕粈涔堟妧鏈紵', options: ['纾ㄥ厜鍜岄捇瀛旀妧鏈?, '鍒朵綔闄跺櫒', '绉嶆姘寸ɑ', '楗插吇瀹剁暅'], answerIndex: 0, explanation: '涓瓑锛氬北椤舵礊浜烘帉鎻＄（鍏夊拰閽诲瓟鎶€鏈€? },
      { id: 'q6', knowledgePointId: 'beijing', prompt: '涓嬪垪鍏充簬鍖椾含浜虹殑璇存硶姝ｇ‘鐨勬槸锛?, options: ['浼氫汉宸ュ彇鐏?, '浼氫娇鐢ㄥぉ鐒剁伀锛屼繚瀛樼伀绉?, '浼氱妞嶅簞绋?, '浼氬埗浣滈櫠鍣?], answerIndex: 1, explanation: '涓瓑锛氬寳浜汉浣跨敤澶╃劧鐏紝淇濆瓨鐏銆? },
      { id: 'q7', knowledgePointId: 'shanding', prompt: '灞遍《娲炰汉宸茬粡鏈変簡浠€涔堣蹇碉紵', options: ['瀹＄編瑙傚康', '瀹楁暀瑙傚康', '鍥藉瑙傚康', '绛夌骇瑙傚康'], answerIndex: 0, explanation: '涓瓑锛氬北椤舵礊浜烘湁瀹＄編瑙傚康锛屼細鍒朵綔瑁呴グ鍝併€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'beijing', prompt: '锛堜腑鑰冪湡棰橈級涓嬪垪鍝竴椤规槸鍖椾含浜轰笉鍚屼簬鐜颁唬浜虹殑鐗瑰緛锛?, options: ['鐩寸珛琛岃蛋', '浼氬埗閫犲伐鍏?, '淇濈暀浜嗙尶鐨勬煇浜涚壒寰?, '杩囩兢灞呯敓娲?], answerIndex: 2, explanation: '鐪熼锛氬寳浜汉淇濈暀浜嗙尶鐨勬煇浜涚壒寰併€? },
      { id: 'q9', knowledgePointId: 'beijing', prompt: '锛堜腑鑰冪湡棰橈級鍖椾含浜哄浼氫娇鐢ㄧ伀鐨勬剰涔夋槸锛?, options: ['鍙互鍙栨殩銆佺儳鐑ら鐗┿€侀┍璧堕噹鍏?, '鍙互鐓ф槑', '鍙互鏀瑰彉浣撹川', '浠ヤ笂閮芥槸'], answerIndex: 3, explanation: '鐪熼锛氱伀鐨勪娇鐢ㄥ寮轰簡浜虹被閫傚簲鑷劧鐨勮兘鍔涖€? },
      { id: 'q10', knowledgePointId: 'yuanmou', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫婚仐鍧€鏄紵', options: ['鍖椾含浜洪仐鍧€', '鍏冭皨浜洪仐鍧€', '灞遍《娲炰汉閬楀潃', '鍗婂潯閬楀潃'], answerIndex: 1, explanation: '鐪熼锛氬厓璋嬩汉閬楀潃鏄垜鍥芥渶鏃╃殑鍙や汉绫婚仐鍧€銆? },
    ],
  },
  {
    id: 'his-7a-1-2', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡锛氫腑鍥藉鍐呮棭鏈熶汉绫讳笌鏂囨槑鐨勮捣婧?, edition: '浜烘暀鐗?, section: '绗?璇?鍘熷鍐滀笟涓庡彶鍓嶇ぞ浼?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p2' },
    knowledgePoints: [
      { id: 'banpo', title: '鍗婂潯灞呮皯', content: '璺濅粖绾?000骞达紝鐢熸椿鍦ㄩ粍娌虫祦鍩燂紝浣忓崐鍦扮┐寮忓渾褰㈡埧灞嬶紝绉嶆绮燂紝鍒朵綔褰╅櫠銆? },
      { id: 'hemu', title: '娌冲娓″眳姘?, content: '璺濅粖绾?000骞达紝鐢熸椿鍦ㄩ暱姹熸祦鍩燂紝浣忓共鏍忓紡寤虹瓚锛岀妞嶆按绋伙紝鍒朵綔鐜夊櫒銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'banpo', prompt: '鍗婂潯灞呮皯鐢熸椿鍦ㄥ摢涓祦鍩燂紵', options: ['榛勬渤娴佸煙', '闀挎睙娴佸煙', '鐝犳睙娴佸煙', '榛戦緳姹熸祦鍩?], answerIndex: 0, explanation: '绠€鍗曪細鍗婂潯灞呮皯鍦ㄩ粍娌虫祦鍩熴€? },
      { id: 'q2', knowledgePointId: 'hemu', prompt: '娌冲娓″眳姘戠敓娲诲湪鍝釜娴佸煙锛?, options: ['榛勬渤娴佸煙', '闀挎睙娴佸煙', '鐝犳睙娴佸煙', '榛戦緳姹熸祦鍩?], answerIndex: 1, explanation: '绠€鍗曪細娌冲娓″眳姘戝湪闀挎睙娴佸煙銆? },
      { id: 'q3', knowledgePointId: 'banpo', prompt: '鍗婂潯灞呮皯绉嶆浠€涔堝啘浣滅墿锛?, options: ['姘寸ɑ', '绮?, '灏忛害', '鐜夌背'], answerIndex: 1, explanation: '绠€鍗曪細鍗婂潯灞呮皯绉嶆绮熴€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'hemu', prompt: '娌冲娓″眳姘戠妞嶄粈涔堝啘浣滅墿锛?, options: ['姘寸ɑ', '绮?, '灏忛害', '鐜夌背'], answerIndex: 0, explanation: '涓瓑锛氭渤濮嗘浮灞呮皯绉嶆姘寸ɑ銆? },
      { id: 'q5', knowledgePointId: 'banpo', prompt: '鍗婂潯灞呮皯浣忎粈涔堟牱鐨勬埧瀛愶紵', options: ['骞叉爮寮忓缓绛?, '鍗婂湴绌村紡鍦嗗舰鎴垮眿', '妤兼埧', '娲炵┐'], answerIndex: 1, explanation: '涓瓑锛氬崐鍧″眳姘戜綇鍗婂湴绌村紡鍦嗗舰鎴垮眿銆? },
      { id: 'q6', knowledgePointId: 'hemu', prompt: '娌冲娓″眳姘戜綇浠€涔堟牱鐨勬埧瀛愶紵', options: ['骞叉爮寮忓缓绛?, '鍗婂湴绌村紡鍦嗗舰鎴垮眿', '妤兼埧', '娲炵┐'], answerIndex: 0, explanation: '涓瓑锛氭渤濮嗘浮灞呮皯浣忓共鏍忓紡寤虹瓚銆? },
      { id: 'q7', knowledgePointId: 'banpo', prompt: '鍗婂潯灞呮皯鍒朵綔鐨勯櫠鍣ㄦ槸浠€涔堬紵', options: ['褰╅櫠', '榛戦櫠', '鐧介櫠', '闈掔摲'], answerIndex: 0, explanation: '涓瓑锛氬崐鍧″眳姘戝埗浣滃僵闄躲€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'banpo', prompt: '锛堜腑鑰冪湡棰橈級鍗婂潯灞呮皯鍜屾渤濮嗘浮灞呮皯鐢熶骇鐢熸椿鐨勪笉鍚岀偣鏄紵', options: ['鍗婂潯绉嶇矡锛屾渤濮嗘浮绉嶆按绋?, '鍗婂潯鍦ㄩ粍娌虫祦鍩燂紝娌冲娓″湪闀挎睙娴佸煙', '鍗婂潯浣忓崐鍦扮┐寮忥紝娌冲娓′綇骞叉爮寮?, '浠ヤ笂閮芥槸'], answerIndex: 3, explanation: '鐪熼锛氭祦鍩熴€佷綔鐗┿€佹埧灞嬮兘涓嶅悓銆? },
      { id: 'q9', knowledgePointId: 'hemu', prompt: '锛堜腑鑰冪湡棰橈級娌冲娓″眳姘戜綇鐫€骞叉爮寮忓缓绛戯紝涓昏鏄洜涓猴紵', options: ['闀挎睙娴佸煙娼箍澶氶洦', '榛勬渤娴佸煙骞茬嚗瀵掑喎', '浠栦滑鍠滄楂樻埧瀛?, '娌℃湁鍘熷洜'], answerIndex: 0, explanation: '鐪熼锛氬共鏍忓紡寤虹瓚閫氶闃叉疆锛岄€傚悎鍗楁柟銆? },
      { id: 'q10', knowledgePointId: 'banpo', prompt: '锛堜腑鑰冪湡棰橈級鍘熷鍐滀笟鍏磋捣鍜屽彂灞曠殑閲嶈鏍囧織鏄紵', options: ['鍐滀綔鐗╃妞?, '瀹剁暅楗插吇', '鑱氳惤', '浠ヤ笂閮芥槸'], answerIndex: 3, explanation: '鐪熼锛氫綔鐗╃妞嶃€佸鐣滈ゲ鍏汇€佽仛钀姐€佺（鍒剁煶鍣ㄩ兘鏄€? },
    ],
  },
  {
    id: 'his-7a-1-3', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡锛氫腑鍥藉鍐呮棭鏈熶汉绫讳笌鏂囨槑鐨勮捣婧?, edition: '浜烘暀鐗?, section: '绗?璇?杩滃彜鐨勪紶璇?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p3' },
    knowledgePoints: [
      { id: 'yandi-huangdi', title: '鐐庡笣鍜岄粍甯?, content: '鐐庨粍閮ㄨ惤鑱旂洘浠ュ悗閫愭笎褰㈡垚鍗庡鏃忥紝娴峰唴澶栧崕浜鸿嚜绉扳€滅値榛勫瓙瀛欌€濄€? },
      { id: 'chiyou', title: '铓╁挨', content: '鐐庨粍閮ㄨ惤涓庤毄灏ら儴钀藉湪娑块箍婵€鎴橈紝鏈€缁堟墦璐ヨ毄灏ゃ€? },
      { id: 'dayu', title: '澶х娌绘按', content: '绂归噰鐢ㄧ枏瀵肩殑鏂规硶锛屼笁杩囧闂ㄨ€屼笉鍏ワ紝娌绘按鎴愬姛銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'yandi-huangdi', prompt: '琚皧宕囦负涓崕姘戞棌浜烘枃鍒濈鐨勬槸锛?, options: ['鐐庡笣鍜岄粍甯?, '灏?, '鑸?, '绂?], answerIndex: 0, explanation: '绠€鍗曪細鐐庡笣鍜岄粍甯濊灏婂磭涓轰汉鏂囧垵绁栥€? },
      { id: 'q2', knowledgePointId: 'yandi-huangdi', prompt: '娴峰唴澶栧崕浜鸿嚜绉帮紵', options: ['鐐庨粍瀛愬瓩', '鍞愪汉', '姹変汉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗庝汉鑷О鐐庨粍瀛愬瓩銆? },
      { id: 'q3', knowledgePointId: 'dayu', prompt: '澶х娌绘按鐢ㄧ殑浠€涔堟柟娉曪紵', options: ['鍫靛', '鐤忓', '鎶藉共', '浠ヤ笂閮戒笉瀵?], answerIndex: 1, explanation: '绠€鍗曪細澶х鐢ㄧ枏瀵肩殑鏂规硶娌绘按銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'yandi-huangdi', prompt: '娑块箍涔嬫垬浜ゆ垬鍙屾柟鏄紵', options: ['鐐庨粍閮ㄨ惤 vs 铓╁挨閮ㄨ惤', '榛勫笣 vs 鐐庡笣', '铓╁挨 vs 灏?, '鑸?vs 绂?], answerIndex: 0, explanation: '涓瓑锛氱値榛勬垬铓╁挨銆? },
      { id: 'q5', knowledgePointId: 'dayu', prompt: '澶х娌绘按鈥滀笁杩囧闂ㄨ€屼笉鍏モ€濓紝璇存槑浠栵紵', options: ['澶у叕鏃犵', '涓嶇埍瀹?, '澶繖', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬ぇ鍏棤绉侊紝涓€蹇冩不姘淬€? },
      { id: 'q6', knowledgePointId: 'yandi-huangdi', prompt: '浼犺涓値甯濈殑鍙戞槑鏈夛紵', options: ['绉嶆浜旇胺', '鍒朵綔闄跺櫒', '鍙戞槑绾虹粐', '浠ヤ笂閮芥槸'], answerIndex: 3, explanation: '涓瓑锛氱値甯濇湁寰堝鍙戞槑銆? },
      { id: 'q7', knowledgePointId: 'yandi-huangdi', prompt: '浼犺涓粍甯濈殑鍙戞槑鏈夛紵', options: ['寤洪€犲瀹?, '鍒朵綔琛ｈ３', '鎸栨帢姘翠簳', '浠ヤ笂閮芥槸'], answerIndex: 3, explanation: '涓瓑锛氶粍甯濇湁寰堝鍙戞槑銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'yandi-huangdi', prompt: '锛堜腑鑰冪湡棰橈級姣忓勾娓呮槑锛屼汉浠兘瑕佸湪闄曡タ榛勫笣闄典妇琛屽叕绁ぇ鍏革紝杩欐槸鍥犱负榛勫笣锛?, options: ['鍙戞槑浜嗘枃瀛?, '鏄腑鍗庢皯鏃忕殑浜烘枃鍒濈', '鍙戞槑浜嗚垷杞?, '浼氭不鐥?], answerIndex: 1, explanation: '鐪熼锛氶粍甯濇槸浜烘枃鍒濈銆? },
      { id: 'q9', knowledgePointId: 'dayu', prompt: '锛堜腑鑰冪湡棰橈級绂规不姘存垚鍔熺殑鍘熷洜鏄紵', options: ['鐢ㄧ枏瀵肩殑鏂规硶', '涓夎繃瀹堕棬鑰屼笉鍏?, '澶у叕鏃犵', '浠ヤ笂閮芥槸'], answerIndex: 3, explanation: '鐪熼锛氭柟娉曟纭?鍏€屽繕绉併€? },
      { id: 'q10', knowledgePointId: 'yandi-huangdi', prompt: '锛堜腑鑰冪湡棰橈級涓嬪垪鍏充簬鐐庡笣鍜岄粍甯濈殑璇存硶锛屾纭殑鏄紵', options: ['浠栦滑鏄湡瀹炲瓨鍦ㄧ殑鍘嗗彶浜虹墿', '浠栦滑鏄紶璇翠腑鐨勪汉鐗?, '浠栦滑鏄鏈濈殑鍥界帇', '浠ヤ笂閮戒笉瀵?], answerIndex: 1, explanation: '鐪熼锛氫粬浠槸浼犺涓殑浜虹墿銆? },
    ],
  },
  {
    id: 'his-7a-2-1', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈燂細鏃╂湡鍥藉涓庣ぞ浼氬彉闈?, edition: '浜烘暀鐗?, section: '绗?璇?澶忓晢瑗垮懆鐨勬洿鏇?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p4' },
    knowledgePoints: [
      { id: 'xia', title: '澶忔湞', content: '绾﹀叕鍏冨墠2070骞达紝绂瑰缓绔嬪鏈濓紝杩欐槸涓浗鍘嗗彶涓婄涓€涓帇鏈濄€傚惎缁ф壙鐖朵綅锛屼笘琚埗浠ｆ浛绂呰鍒躲€? },
      { id: 'shang', title: '鍟嗘湞', content: '绾﹀叕鍏冨墠1600骞达紝姹ゅ缓绔嬪晢鏈濄€傜洏搴氳縼娈峰悗锛屽晢鏈濈ǔ瀹氫笅鏉ャ€? },
      { id: 'zhou', title: '瑗垮懆', content: '鍏厓鍓?046骞达紝鐗ч噹涔嬫垬锛屽懆姝︾帇寤虹珛瑗垮懆銆傝タ鍛ㄥ疄琛屽垎灏佸埗銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'xia', prompt: '涓浗鍘嗗彶涓婄涓€涓帇鏈濇槸锛?, options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '绉︽湞'], answerIndex: 0, explanation: '绠€鍗曪細澶忔湞鏄涓€涓帇鏈濄€? },
      { id: 'q2', knowledgePointId: 'xia', prompt: '澶忔湞鐨勫缓绔嬭€呮槸锛?, options: ['绂?, '鍚?, '姹?, '鍛ㄦ鐜?], answerIndex: 0, explanation: '绠€鍗曪細绂瑰缓绔嬪鏈濄€? },
      { id: 'q3', knowledgePointId: 'zhou', prompt: '瑗垮懆鐨勫缓绔嬭€呮槸锛?, options: ['绂?, '姹?, '鍛ㄦ鐜?, '鍛ㄥ帀鐜?], answerIndex: 2, explanation: '绠€鍗曪細鍛ㄦ鐜嬪缓绔嬭タ鍛ㄣ€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'xia', prompt: '涓栬鍒朵唬鏇跨璁╁埗鐨勬爣蹇楁槸锛?, options: ['绂逛紶浣嶇粰浼泭', '鍚户鎵跨埗浣?, '姹ょ伃澶?, '姝︾帇浼愮海'], answerIndex: 1, explanation: '涓瓑锛氬惎缁ф壙鐖朵綅锛屼笘琚埗寮€濮嬨€? },
      { id: 'q5', knowledgePointId: 'shang', prompt: '鐩樺簹杩佹鍚庯紝鍟嗘湞閮藉煄绋冲畾鍦紵', options: ['浜?, '娈?, '闀愪含', '娲涢倯'], answerIndex: 1, explanation: '涓瓑锛氱洏搴氳縼娈枫€? },
      { id: 'q6', knowledgePointId: 'zhou', prompt: '鐗ч噹涔嬫垬鍙戠敓鍦ㄤ粈涔堟椂鍊欙紵', options: ['绾﹀叕鍏冨墠2070骞?, '绾﹀叕鍏冨墠1600骞?, '鍏厓鍓?046骞?, '鍏厓鍓?71骞?], answerIndex: 2, explanation: '涓瓑锛氬叕鍏冨墠1046骞寸墽閲庝箣鎴樸€? },
      { id: 'q7', knowledgePointId: 'zhou', prompt: '瑗垮懆瀹炶浠€涔堝埗搴︼紵', options: ['绂呰鍒?, '涓栬鍒?, '鍒嗗皝鍒?, '閮″幙鍒?], answerIndex: 2, explanation: '涓瓑锛氳タ鍛ㄥ疄琛屽垎灏佸埗銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'xia', prompt: '锛堜腑鑰冪湡棰橈級鈥滃ぉ涓嬩负瀹垛€濓紙涓栬鍒讹級浠ｆ浛鈥滃ぉ涓嬩负鍏€濓紙绂呰鍒讹級寮€濮嬩簬锛?, options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '绉︽湞'], answerIndex: 0, explanation: '鐪熼锛氬鏈濆紑濮嬩笘琚埗銆? },
      { id: 'q9', knowledgePointId: 'zhou', prompt: '锛堜腑鑰冪湡棰橈級瑗垮懆鍒嗗皝鍒剁殑涓昏鐩殑鏄紵', options: ['鍒嗗壊璇镐警鏉冨姏', '宸╁浐鍛ㄧ帇瀹ょ粺娌?, '淇濊瘉鍥藉鍏垫簮', '鍒嗗壊濂撮毝'], answerIndex: 1, explanation: '鐪熼锛氬珐鍥虹粺娌汇€? },
      { id: 'q10', knowledgePointId: 'shang', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗鏈夋枃瀛楀彲鑰冪殑鍘嗗彶浠庝粈涔堟椂鍊欏紑濮嬶紵', options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '涓滃懆'], answerIndex: 1, explanation: '鐪熼锛氬晢鏈濈敳楠ㄦ枃銆? },
    ],
  },
  {
    id: 'his-7a-2-2', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈燂細鏃╂湡鍥藉涓庣ぞ浼氬彉闈?, edition: '浜烘暀鐗?, section: '绗?璇?闈掗摐鍣ㄤ笌鐢查鏂?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p5' },
    knowledgePoints: [
      { id: 'bronze', title: '闈掗摐鍣?, content: '鍟嗘湞鏄垜鍥介潚閾滄枃鍖栫殑鐏跨儌鏃舵湡銆傝憲鍚嶇殑闈掗摐鍣ㄦ湁鍙告瘝鎴婇紟锛堝悗姣嶆垔榧庯級鍜屽洓缇婃柟灏娿€? },
      { id: 'oracle', title: '鐢查鏂?, content: '鐢查鏂囨槸鍟嗘湞浜哄埢鍐欏湪榫熺敳鎴栧吔楠ㄤ笂鐨勬枃瀛椼€傛垜鍥芥湁鏂囧瓧鍙€冪殑鍘嗗彶浠庡晢鏈濆紑濮嬨€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'bronze', prompt: '鍟嗘湞鏄垜鍥戒粈涔堟枃鍖栫殑鐏跨儌鏃舵湡锛?, options: ['闈掗摐鏂囧寲', '閾佸櫒鏂囧寲', '鐜夊櫒鏂囧寲', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍟嗘湞闈掗摐鏂囧寲鐏跨儌銆? },
      { id: 'q2', knowledgePointId: 'bronze', prompt: '涓栫晫涓婄幇瀛樻渶澶х殑闈掗摐鍣ㄦ槸锛?, options: ['鍙告瘝鎴婇紟', '鍥涚緤鏂瑰皧', '闈掗摐绔嬩汉鍍?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍙告瘝鎴婇紟銆? },
      { id: 'q3', knowledgePointId: 'oracle', prompt: '鐢查鏂囨槸鍒诲啓鍦ㄤ粈涔堜笂闈㈢殑鏂囧瓧锛?, options: ['榫熺敳鎴栧吔楠?, '绔圭畝', '闈掗摐鍣?, '鐭冲櫒'], answerIndex: 0, explanation: '绠€鍗曪細榫熺敳鎴栧吔楠ㄣ€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'bronze', prompt: '鍟嗘湞闈掗摐鍣ㄧ殑浠ｈ〃浣滄湁锛?, options: ['鍙告瘝鎴婇紟', '鍥涚緤鏂瑰皧', '浠ヤ笂閮芥槸', '浠ヤ笂閮戒笉瀵?], answerIndex: 2, explanation: '涓瓑锛氬徃姣嶆垔榧庡拰鍥涚緤鏂瑰皧銆? },
      { id: 'q5', knowledgePointId: 'oracle', prompt: '鎴戝浗鏈夋枃瀛楀彲鑰冪殑鍘嗗彶浠庡摢涓湞浠ｅ紑濮嬶紵', options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '涓滃懆'], answerIndex: 1, explanation: '涓瓑锛氬晢鏈濈敳楠ㄦ枃銆? },
      { id: 'q6', knowledgePointId: 'oracle', prompt: '鐢查鏂囨槸涓€绉嶆瘮杈冩垚鐔熺殑鏂囧瓧锛屾垜鍥界殑姹夊瓧灏辨槸浠庡畠鍙戝睍鑰屾潵鐨勶紝瀹冨嚭鐜板湪锛?, options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '涓滃懆'], answerIndex: 1, explanation: '涓瓑锛氬晢鏈濄€? },
      { id: 'q7', knowledgePointId: 'bronze', prompt: '鍥涚緤鏂瑰皧鐨勭壒鐐规槸锛?, options: ['閫犲瀷濂囩壒', '鏄笘鐣屼笂鏈€澶х殑闈掗摐鍣?, '鏄敤鏉ョキ绁€鐨?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶€犲瀷濂囩壒銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'bronze', prompt: '锛堜腑鑰冪湡棰橈級宸ㄥぇ鐨勫徃姣嶆垔榧庡拰閫犲瀷濂囩壒鐨勫洓缇婃柟灏婏紝瀹冧滑鍏呭垎浣撶幇浜嗘垜鍥藉彜浠ｅ摢涓€鏃舵湡鐨勯潚閾滄枃鏄庯紵', options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '涓滃懆'], answerIndex: 1, explanation: '鐪熼锛氬晢鏈濄€? },
      { id: 'q9', knowledgePointId: 'oracle', prompt: '锛堜腑鑰冪湡棰橈級鐮旂┒鍘嗗彶绂讳笉寮€鏂囧瓧璧勬枡锛屾垜鍥芥湁鏂囧瓧鍙€冪殑鍘嗗彶寮€濮嬩簬锛?, options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '涓滃懆'], answerIndex: 1, explanation: '鐪熼锛氬晢鏈濈敳楠ㄦ枃銆? },
      { id: 'q10', knowledgePointId: 'oracle', prompt: '锛堜腑鑰冪湡棰橈級鐢查鏂囨槸涓€绉嶆瘮杈冩垚鐔熺殑鏂囧瓧锛屼笅鍒楀叧浜庣敳楠ㄦ枃鐨勮娉曟纭殑鏄紵', options: ['瀹冩槸鍒诲啓鍦ㄩ緹鐢叉垨鍏介涓婄殑鏂囧瓧', '瀹冩槸鍟嗘湞鐨勬枃瀛?, '瀹冩槸鎴戝浗鏈€鏃╃殑鏂囧瓧', '浠ヤ笂閮藉'], answerIndex: 3, explanation: '鐪熼锛氫互涓婇兘瀵广€? },
    ],
  },
  {
    id: 'his-8a-1-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '浜烘暀鐗?, section: '绗?璇?楦︾墖鎴樹簤',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his8a', locator: 'p1' },
    knowledgePoints: [
      { id: 'opium', title: '鏋楀垯寰愯檸闂ㄩ攢鐑?, content: '1839骞?鏈堬紝鏋楀垯寰愬湪铏庨棬娴锋哗褰撲紬閿€姣侀甫鐗囷紝鏄剧ず浜嗕腑鍗庢皯鏃忓弽鎶楀鏉ヤ镜鐣ョ殑鍧氬己鎰忓織銆? },
      { id: 'war', title: '楦︾墖鎴樹簤', content: '1840骞达紝鑻卞浗鍙戝姩楦︾墖鎴樹簤銆?842骞达紝娓呮斂搴滆杩璁€婂崡浜潯绾︺€嬨€備腑鍥藉紑濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熺殑姘戞棌鑻遍泟鏄紵', options: ['鏋楀垯寰?, '鍏冲ぉ鍩?, '闄堝寲鎴?, '閭撲笘鏄?], answerIndex: 0, explanation: '绠€鍗曪細鏋楀垯寰愯檸闂ㄩ攢鐑熴€? },
      { id: 'q2', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熷彂鐢熷湪鍝竴骞达紵', options: ['1839骞?, '1840骞?, '1842骞?, '1856骞?], answerIndex: 0, explanation: '绠€鍗曪細1839骞?鏈堛€? },
      { id: 'q3', knowledgePointId: 'war', prompt: '楦︾墖鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1839骞?, '1840骞?, '1842骞?, '1856骞?], answerIndex: 1, explanation: '绠€鍗曪細1840骞淬€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'war', prompt: '涓浗杩戜唬鍙蹭笂绗竴涓笉骞崇瓑鏉＄害鏄紵', options: ['銆婂崡浜潯绾︺€?, '銆婂寳浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 0, explanation: '涓瓑锛氥€婂崡浜潯绾︺€嬨€? },
      { id: 'q5', knowledgePointId: 'war', prompt: '銆婂崡浜潯绾︺€嬪壊璁╃粰鑻卞浗鐨勫湴鏂规槸锛?, options: ['棣欐腐宀?, '涔濋緳鍙?, '鏂扮晫', '婢抽棬'], answerIndex: 0, explanation: '涓瓑锛氬壊棣欐腐宀涖€? },
      { id: 'q6', knowledgePointId: 'war', prompt: '楦︾墖鎴樹簤鍚庯紝涓浗绀句細鎬ц川寮€濮嬪彉涓猴紵', options: ['灏佸缓绀句細', '鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '璧勬湰涓讳箟绀句細', '绀句細涓讳箟绀句細'], answerIndex: 1, explanation: '涓瓑锛氬紑濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細銆? },
      { id: 'q7', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熺殑鎰忎箟鏄紵', options: ['鏄剧ず浜嗕腑鍗庢皯鏃忓弽鎶楀鏉ヤ镜鐣ョ殑鍧氬己鎰忓織', '涓浗寮€濮嬫拨涓哄崐娈栨皯鍦?, '楦︾墖鎴樹簤鐖嗗彂', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭樉绀哄弽鎶楁剰蹇椼€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級鑻卞浗鍙戝姩楦︾墖鎴樹簤鐨勬牴鏈洰鐨勬槸锛?, options: ['淇濇姢楦︾墖璐告槗', '鎵撳紑涓浗甯傚満锛屽€鹃攢鍟嗗搧', '鍓插崰涓浗棰嗗湡', '浜夊彇澶栦氦绀间华骞崇瓑'], answerIndex: 1, explanation: '鐪熼锛氬伐涓氶潻鍛藉悗闇€瑕佹墦寮€甯傚満銆? },
      { id: 'q9', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級銆婂崡浜潯绾︺€嬪唴瀹逛腑锛屾渶鑳戒綋鐜拌嫳鍥藉彂鍔ㄦ垬浜夌洰鐨勭殑鏉℃鏄紵', options: ['鍓查娓矝', '璧旀2100涓囬摱鍏?, '寮€鏀句簲鍙ｉ€氬晢', '鍗忓畾鍏崇◣'], answerIndex: 2, explanation: '鐪熼锛氫簲鍙ｉ€氬晢鏂逛究鍊鹃攢鍟嗗搧銆? },
      { id: 'q10', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級楦︾墖鎴樹簤鏄腑鍥借繎浠ｅ彶鐨勫紑绔紝涓昏鏄洜涓猴紵', options: ['涓浗绗竴娆¤瑗挎柟鍥藉鎵撹触', '涓浗绀句細鎬ц川鍙戠敓浜嗗彉鍖?, '涓浗琚揩寮€鏀?, '涓浗浜哄紑濮嬬潄鐪肩湅涓栫晫'], answerIndex: 1, explanation: '鐪熼锛氱ぞ浼氭€ц川鍙樺寲鏄牴鏈師鍥犮€? },
    ],
  },
  {
    id: 'his-9a-1-1', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙や唬浜氶潪鏂囨槑', edition: '浜烘暀鐗?, section: '绗?璇?鍙や唬鍩冨強',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his9a', locator: 'p1' },
    knowledgePoints: [
      { id: 'egypt', title: '鍙や唬鍩冨強', content: '鍙ゅ焹鍙婁綅浜庨潪娲蹭笢鍖楅儴灏肩綏娌虫祦鍩熴€傞噾瀛楀鏄彜鍩冨強鏂囨槑鐨勮薄寰併€? },
      { id: 'pyramid', title: '閲戝瓧濉?, content: '閲戝瓧濉旀槸鍙ゅ焹鍙婃硶鑰佺殑闄靛锛屾渶澶х殑鏄儭澶噾瀛楀銆傞噾瀛楀鏄彜鍩冨強浜烘櫤鎱х殑缁撴櫠銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'egypt', prompt: '鍙や唬鍩冨強鍙戞簮浜庡摢鏉℃渤娴侊紵', options: ['灏肩綏娌?, '骞煎彂鎷夊簳娌?, '搴曟牸閲屾柉娌?, '鍗板害娌?], answerIndex: 0, explanation: '绠€鍗曪細灏肩綏娌炽€? },
      { id: 'q2', knowledgePointId: 'egypt', prompt: '鍙や唬鍩冨強浣嶄簬鍝釜澶ф床锛?, options: ['闈炴床', '浜氭床', '娆ф床', '缇庢床'], answerIndex: 0, explanation: '绠€鍗曪細闈炴床涓滃寳閮ㄣ€? },
      { id: 'q3', knowledgePointId: 'pyramid', prompt: '鍙ゅ焹鍙婃枃鏄庣殑璞″緛鏄紵', options: ['閲戝瓧濉?, '绌轰腑鑺卞洯', '闀垮煄', '娉板К闄?], answerIndex: 0, explanation: '绠€鍗曪細閲戝瓧濉斻€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'pyramid', prompt: '閲戝瓧濉旀槸鍙ゅ焹鍙婁粈涔堜汉鐨勯櫟澧擄紵', options: ['娉曡€?, '璐垫棌', '濂撮毝', '骞虫皯'], answerIndex: 0, explanation: '涓瓑锛氭硶鑰佺殑闄靛銆? },
      { id: 'q5', knowledgePointId: 'pyramid', prompt: '鏈€澶х殑閲戝瓧濉旀槸锛?, options: ['鑳″か閲戝瓧濉?, '鍝堝か鎷夐噾瀛楀', '瀛熷崱鎷夐噾瀛楀', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳儭澶噾瀛楀鏈€澶с€? },
      { id: 'q6', knowledgePointId: 'egypt', prompt: '鍙ゅ焹鍙婁汉鍙戞槑鐨勬枃瀛楁槸锛?, options: ['璞″舰鏂囧瓧', '妤斿舰鏂囧瓧', '鐢查鏂?, '瀛楁瘝鏂囧瓧'], answerIndex: 0, explanation: '涓瓑锛氳薄褰㈡枃瀛椼€? },
      { id: 'q7', knowledgePointId: 'pyramid', prompt: '閲戝瓧濉旂殑鐢ㄩ€旀槸锛?, options: ['娉曡€佺殑闄靛', '瀹', '绁炲簷', '澶╂枃鍙?], answerIndex: 0, explanation: '涓瓑锛氶櫟澧撱€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'egypt', prompt: '锛堜腑鑰冪湡棰橈級"鍙ゅ焹鍙婁綅浜庨潪娲蹭笢鍖楅儴锛屾皵鍊欏共鏃憋紝涓€骞村洓瀛ｉ洦閲忕█灏戙€?鍙ゅ焹鍙婃枃鏄庣殑褰㈡垚涓庡摢鏉℃渤娴佸瘑鍒囩浉鍏筹紵', options: ['灏肩綏娌?, '骞煎彂鎷夊簳娌?, '搴曟牸閲屾柉娌?, '鍗板害娌?], answerIndex: 0, explanation: '鐪熼锛氬凹缃楁渤銆? },
      { id: 'q9', knowledgePointId: 'pyramid', prompt: '锛堜腑鑰冪湡棰橈級閲戝瓧濉斾粠鍙ゅ焹鍙婄殑璇炵敓鍦扮湅锛屽畠浣嶄簬锛?, options: ['灏肩綏娌虫祦鍩?, '涓ゆ渤娴佸煙', '鍗板害娌虫祦鍩?, '榛勬渤娴佸煙'], answerIndex: 0, explanation: '鐪熼锛氬凹缃楁渤娴佸煙銆? },
      { id: 'q10', knowledgePointId: 'pyramid', prompt: '锛堜腑鑰冪湡棰橈級涓嬪垪鍏充簬閲戝瓧濉旂殑璇存硶锛岄敊璇殑鏄紵', options: ['瀹冩槸鍙ゅ焹鍙婃硶鑰佺殑闄靛', '瀹冩槸鍙ゅ焹鍙婃枃鏄庣殑璞″緛', '瀹冩槸鍙ゅ焹鍙婁汉鏅烘収鐨勭粨鏅?, '瀹冩槸鍙ゅ反姣斾鸡鏂囨槑鐨勮薄寰?], answerIndex: 3, explanation: '鐪熼锛氭槸鍙ゅ焹鍙婁笉鏄彜宸存瘮浼︺€? },
    ],
  },
  {
    id: 'his-8a-1-2', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '浜烘暀鐗?, section: '绗?璇?绗簩娆￠甫鐗囨垬浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his8a', locator: 'p2' },
    knowledgePoints: [
      { id: 'war', title: '绗簩娆￠甫鐗囨垬浜?, content: '1856-1860骞达紝鑻辨硶鍙戝姩绗簩娆￠甫鐗囨垬浜夈€?860骞达紝鑻辨硶鑱斿啗鐏儳鍦嗘槑鍥€? },
      { id: 'treaty', title: '涓嶅钩绛夋潯绾?, content: '銆婂ぉ娲ユ潯绾︺€嬨€婂寳浜潯绾︺€嬨€傛矙淇勪镜鍗犱腑鍥藉寳鏂瑰ぇ鐗囬鍦熴€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'war', prompt: '绗簩娆￠甫鐗囨垬浜夌殑鍙戝姩鑰呮槸锛?, options: ['鑻便€佹硶', '鑻便€佺編', '娉曘€佺編', '淇勩€佺編'], answerIndex: 0, explanation: '绠€鍗曪細鑻辨硶鍙戝姩銆? },
      { id: 'q2', knowledgePointId: 'war', prompt: '鐏儳鍦嗘槑鍥殑鏄紵', options: ['鑻卞啗', '娉曞啗', '鑻辨硶鑱斿啗', '鍏浗鑱斿啗'], answerIndex: 2, explanation: '绠€鍗曪細鑻辨硶鑱斿啗鐏儳鍦嗘槑鍥€? },
      { id: 'q3', knowledgePointId: 'war', prompt: '绗簩娆￠甫鐗囨垬浜夌垎鍙戜簬鍝竴骞达紵', options: ['1840骞?, '1856骞?, '1860骞?, '1894骞?], answerIndex: 1, explanation: '绠€鍗曪細1856骞淬€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'war', prompt: '鐏儳鍦嗘槑鍥彂鐢熷湪鍝竴骞达紵', options: ['1856骞?, '1860骞?, '1894骞?, '1900骞?], answerIndex: 1, explanation: '涓瓑锛?860骞淬€? },
      { id: 'q5', knowledgePointId: 'treaty', prompt: '绗簩娆￠甫鐗囨垬浜変腑锛屽摢涓浗瀹朵镜鍗犱腑鍥介鍦熸渶澶氾紵', options: ['鑻卞浗', '娉曞浗', '淇勫浗', '缇庡浗'], answerIndex: 2, explanation: '涓瓑锛氭矙淇勪镜鍗?50澶氫竾骞虫柟鍏噷銆? },
      { id: 'q6', knowledgePointId: 'treaty', prompt: '绗簩娆￠甫鐗囨垬浜夊悗锛屾竻鏀垮簻琚揩绛捐浜嗭紵', options: ['銆婂崡浜潯绾︺€?, '銆婂寳浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 1, explanation: '涓瓑锛氥€婂寳浜潯绾︺€嬨€? },
      { id: 'q7', knowledgePointId: 'war', prompt: '绗簩娆￠甫鐗囨垬浜変娇涓浗鍗婃畺姘戝湴鍖栫▼搴︼紵', options: ['寮€濮?, '杩涗竴姝ュ姞娣?, '澶уぇ鍔犳繁', '瀹屽叏娌︿负'], answerIndex: 1, explanation: '涓瓑锛氳繘涓€姝ュ姞娣便€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級鐏儳鍦嗘槑鍥彂鐢熷湪锛?, options: ['楦︾墖鎴樹簤', '绗簩娆￠甫鐗囨垬浜?, '鐢插崍涓棩鎴樹簤', '鍏浗鑱斿啗渚靛崕鎴樹簤'], answerIndex: 1, explanation: '鐪熼锛氱浜屾楦︾墖鎴樹簤銆? },
      { id: 'q9', knowledgePointId: 'treaty', prompt: '锛堜腑鑰冪湡棰橈級杩戜唬鍙蹭笂锛屼镜鍗犱腑鍥介鍦熸渶澶氱殑鍥藉鏄紵', options: ['鑻卞浗', '娉曞浗', '淇勫浗', '鏃ユ湰'], answerIndex: 2, explanation: '鐪熼锛氫縿鍥姐€? },
      { id: 'q10', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級绗簩娆￠甫鐗囨垬浜変腑锛岃杩紑鏀剧殑閫氬晢鍙ｅ哺涓嶅寘鎷紵', options: ['姹夊彛', '鍗椾含', '澶╂触', '骞垮窞'], answerIndex: 3, explanation: '鐪熼锛氬箍宸炴槸绗竴娆￠甫鐗囨垬浜夊紑鏀剧殑銆? },
    ],
  },
  {
    id: 'his-9a-1-2', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙や唬浜氶潪鏂囨槑', edition: '浜烘暀鐗?, section: '绗?璇?鍙や唬涓ゆ渤娴佸煙',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his9a', locator: 'p2' },
    knowledgePoints: [
      { id: 'mesopotamia', title: '涓ゆ渤娴佸煙', content: '涓ゆ渤娴佸煙鎸囧辜鍙戞媺搴曟渤鍜屽簳鏍奸噷鏂渤锛屽張绉?缇庣储涓嶈揪绫充簹"銆? },
      { id: 'hammurabi', title: '銆婃眽璋熸媺姣旀硶鍏搞€?, content: '鍙ゅ反姣斾鸡鐜嬪浗鍥界帇姹夎盁鎷夋瘮鍒跺畾銆傛槸杩勪粖宸茬煡涓栫晫涓婄涓€閮ㄨ緝涓哄畬鏁寸殑鎴愭枃娉曞吀銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'mesopotamia', prompt: '涓ゆ渤娴佸煙鎸囩殑鏄摢涓ゆ潯娌筹紵', options: ['骞煎彂鎷夊簳娌冲拰搴曟牸閲屾柉娌?, '灏肩綏娌冲拰骞煎彂鎷夊簳娌?, '搴曟牸閲屾柉娌冲拰鍗板害娌?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細骞煎彂鎷夊簳娌冲拰搴曟牸閲屾柉娌炽€? },
      { id: 'q2', knowledgePointId: 'mesopotamia', prompt: '涓ゆ渤娴佸煙鍙堢О锛?, options: ['缇庣储涓嶈揪绫充簹', '灏肩綏娌?, '鍗板害娌?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細缇庣储涓嶈揪绫充簹銆? },
      { id: 'q3', knowledgePointId: 'hammurabi', prompt: '銆婃眽璋熸媺姣旀硶鍏搞€嬫槸鍝釜鍥藉鐨勶紵', options: ['鍙ゅ焹鍙?, '鍙ゅ反姣斾鸡', '鍙ゅ嵃搴?, '鍙ゅ笇鑵?], answerIndex: 1, explanation: '绠€鍗曪細鍙ゅ反姣斾鸡銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'hammurabi', prompt: '銆婃眽璋熸媺姣旀硶鍏搞€嬫槸璋佸埗瀹氱殑锛?, options: ['姹夎盁鎷夋瘮', '鑳″か', '鍥剧壒鎽╂柉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭眽璋熸媺姣斻€? },
      { id: 'q5', knowledgePointId: 'hammurabi', prompt: '銆婃眽璋熸媺姣旀硶鍏搞€嬫槸杩勪粖宸茬煡涓栫晫涓婄涓€閮紵', options: ['杈冧负瀹屾暣鐨勬垚鏂囨硶鍏?, '鏈€鍙よ€佺殑娉曞吀', '鏈€瀹屽杽鐨勬硶鍏?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱涓€閮ㄨ緝涓哄畬鏁寸殑鎴愭枃娉曞吀銆? },
      { id: 'q6', knowledgePointId: 'hammurabi', prompt: '銆婃眽璋熸媺姣旀硶鍏搞€嬪埢鍦ㄤ粈涔堜笂闈紵', options: ['鐭虫煴', '鐭崇', '绔圭畝', '绾歌崏'], answerIndex: 0, explanation: '涓瓑锛氬埢鍦ㄧ煶鏌变笂銆? },
      { id: 'q7', knowledgePointId: 'hammurabi', prompt: '銆婃眽璋熸媺姣旀硶鍏搞€嬬殑瀹炶川鏄紵', options: ['缁存姢濂撮毝涓婚樁绾х殑鍒╃泭', '缁存姢濂撮毝鐨勫埄鐩?, '缁存姢骞虫皯鐨勫埄鐩?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱淮鎶ゅゴ闅朵富鍒╃泭銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'mesopotamia', prompt: '锛堜腑鑰冪湡棰橈級涓ゆ渤娴佸煙鏄笘鐣屽彜浠ｆ枃鏄庣殑鍙戠ゥ鍦颁箣涓€锛?涓ゆ渤"鎸囩殑鏄紵', options: ['鍗板害娌冲拰鎭掓渤', '灏肩綏娌冲拰榛勬渤', '骞煎彂鎷夊簳娌冲拰搴曟牸閲屾柉娌?, '浜氶┈閫婃渤鍜屽瘑瑗胯タ姣旀渤'], answerIndex: 2, explanation: '鐪熼锛氬辜鍙戞媺搴曟渤鍜屽簳鏍奸噷鏂渤銆? },
      { id: 'q9', knowledgePointId: 'hammurabi', prompt: '锛堜腑鑰冪湡棰橈級銆婃眽璋熸媺姣旀硶鍏搞€嬫槸涓栫晫涓婄涓€閮ㄦ瘮杈冨畬澶囩殑鎴愭枃娉曞吀锛屽畠鍑鸿嚜浜庯紵', options: ['鍙ゅ焹鍙?, '鍙ゅ反姣斾鸡', '鍙ゅ嵃搴?, '鍙ゅ笇鑵?], answerIndex: 1, explanation: '鐪熼锛氬彜宸存瘮浼︺€? },
      { id: 'q10', knowledgePointId: 'hammurabi', prompt: '锛堜腑鑰冪湡棰橈級銆婃眽璋熸媺姣旀硶鍏搞€嬬淮鎶ょ殑鏄摢涓樁绾х殑鍒╃泭锛?, options: ['濂撮毝涓婚樁绾?, '濂撮毝闃剁骇', '骞虫皯闃剁骇', '璧勪骇闃剁骇'], answerIndex: 0, explanation: '鐪熼锛氬ゴ闅朵富闃剁骇銆? },
    ],
  },
  {
    id: 'his-8a-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '浜烘暀鐗?, section: '绗?璇?楦︾墖鎴樹簤',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his8a', locator: 'p1' },
    knowledgePoints: [
      { id: 'opium', title: '鏋楀垯寰愯檸闂ㄩ攢鐑?, content: '1839骞?鏈?鏃ワ紝鏋楀垯寰愪笅浠ゅ皢缂磋幏鐨勫叏閮ㄩ甫鐗囷紝鍦ㄨ檸闂ㄦ捣婊╁綋浼楅攢姣併€傝檸闂ㄩ攢鐑熸槸涓浗浜烘皯绂佺儫鏂椾簤鐨勪紵澶ц儨鍒╋紝鏄剧ず浜嗕腑鍗庢皯鏃忓弽鎶楀鏉ヤ镜鐣ョ殑鍧氬己鎰忓織銆? },
      { id: 'war', title: '楦︾墖鎴樹簤', content: '1840骞?鏈堬紝鑻卞浗鑸伴槦渚靛叆涓浗骞夸笢娴烽潰锛岄甫鐗囨垬浜夋寮忕垎鍙戙€?842骞?鏈堬紝鑻卞浗鑸伴槦娌块暱姹熻€屼笅锛岀洿閫煎崡浜煄涓嬶紝鐢ㄦ鍔涘己杩竻鏀垮簻绛捐浜嗕腑鑻便€婂崡浜潯绾︺€嬨€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熺殑姘戞棌鑻遍泟鏄紵', options: ['鏋楀垯寰?, '鍏冲ぉ鍩?, '闄堝寲鎴?, '閭撲笘鏄?], answerIndex: 0, explanation: '绠€鍗曪細鏋楀垯寰愩€? },
      { id: 'q2', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熷彂鐢熷湪鍝竴骞达紵', options: ['1839骞?, '1840骞?, '1842骞?, '1843骞?], answerIndex: 0, explanation: '绠€鍗曪細1839骞淬€? },
      { id: 'q3', knowledgePointId: 'war', prompt: '楦︾墖鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1839骞?, '1840骞?, '1842骞?, '1843骞?], answerIndex: 1, explanation: '绠€鍗曪細1840骞淬€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'war', prompt: '涓浗杩戜唬鍙蹭笂绗竴涓笉骞崇瓑鏉＄害鏄紵', options: ['銆婂崡浜潯绾︺€?, '銆婂寳浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 0, explanation: '涓瓑锛氥€婂崡浜潯绾︺€嬨€? },
      { id: 'q5', knowledgePointId: 'war', prompt: '銆婂崡浜潯绾︺€嬩腑锛屼腑鍥藉壊璁╃粰鑻卞浗鐨勫湴鏂规槸锛?, options: ['棣欐腐宀?, '涔濋緳', '鏂扮晫', '婢抽棬'], answerIndex: 0, explanation: '涓瓑锛氶娓矝銆? },
      { id: 'q6', knowledgePointId: 'war', prompt: '楦︾墖鎴樹簤鍚庯紝涓浗绀句細鎬ц川寮€濮嬪彉涓猴紵', options: ['灏佸缓绀句細', '鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '璧勬湰涓讳箟绀句細', '浠ヤ笂閮戒笉瀵?], answerIndex: 1, explanation: '涓瓑锛氬崐娈栨皯鍦板崐灏佸缓绀句細銆? },
      { id: 'q7', knowledgePointId: 'war', prompt: '楦︾墖鎴樹簤鏄腑鍥戒粈涔堢殑寮€绔紵', options: ['杩戜唬鍙?, '鍙や唬鍙?, '鐜颁唬鍙?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫腑鍥借繎浠ｅ彶鐨勫紑绔€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'opium', prompt: '锛堜腑鑰冪湡棰橈級"鑻熷埄鍥藉鐢熸浠ワ紝宀傚洜绁哥閬胯秼涔?鏄皝鐨勫悕瑷€锛?, options: ['鏋楀垯寰?, '鍏冲ぉ鍩?, '闄堝寲鎴?, '閭撲笘鏄?], answerIndex: 0, explanation: '鐪熼锛氭灄鍒欏緪銆? },
      { id: 'q9', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級涓浗杩戜唬鍙茬殑寮€绔槸锛?, options: ['楦︾墖鎴樹簤', '绗簩娆￠甫鐗囨垬浜?, '鐢插崍涓棩鎴樹簤', '鍏浗鑱斿啗渚靛崕鎴樹簤'], answerIndex: 0, explanation: '鐪熼锛氶甫鐗囨垬浜夈€? },
      { id: 'q10', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級銆婂崡浜潯绾︺€嬭瀹氬紑鏀剧殑閫氬晢鍙ｅ哺涓嶅寘鎷紵', options: ['骞垮窞', '鍘﹂棬', '绂忓窞', '鍗椾含'], answerIndex: 3, explanation: '鐪熼锛氫簲鍙ｉ€氬晢鏄箍宸炪€佸帵闂ㄣ€佺宸炪€佸畞娉€佷笂娴枫€? },
    ],
  },
  {
    id: 'his-9a-3', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙や唬浜氶潪鏂囨槑', edition: '浜烘暀鐗?, section: '绗?璇?鍙や唬鍗板害',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his9a', locator: 'p3' },
    knowledgePoints: [
      { id: 'indus', title: '鍙や唬鍗板害', content: '鍙や唬鍗板害鍦ㄥ湴鐞嗕笂鏄寚浠婂ぉ鐨勫崡浜氭澶ч檰銆傚嵃搴︽渤娴佸煙鍙戠幇鐨勫搱鎷夊笗鍜屾懇浜ㄤ綈路杈剧綏绛夋棭鏈熸枃鏄庨仐鍧€銆? },
      { id: 'caste', title: '绉嶅鍒跺害', content: '闆呭埄瀹変汉杩涘叆鍗板害鍚庯紝閫愭笎寤虹珛浜嗕弗鏍肩殑绀句細绛夌骇鍒跺害锛屽彶绉?绉嶅鍒跺害"銆傚洓涓瓑绾э細濠嗙綏闂ㄣ€佸埞甯濆埄銆佸悹鑸嶃€侀闄€缃椼€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'indus', prompt: '鍙や唬鍗板害鏂囨槑鍙戞簮浜庯紵', options: ['鍗板害娌虫祦鍩?, '灏肩綏娌虫祦鍩?, '涓ゆ渤娴佸煙', '榛勬渤娴佸煙'], answerIndex: 0, explanation: '绠€鍗曪細鍗板害娌虫祦鍩熴€? },
      { id: 'q2', knowledgePointId: 'indus', prompt: '鍙や唬鍗板害鍦ㄥ湴鐞嗕笂鏄寚浠婂ぉ鐨勶紵', options: ['鍗椾簹娆″ぇ闄?, '涓滀簹', '瑗夸簹', '鍖楅潪'], answerIndex: 0, explanation: '绠€鍗曪細鍗椾簹娆″ぇ闄嗐€? },
      { id: 'q3', knowledgePointId: 'caste', prompt: '鍙や唬鍗板害鐨勭ぞ浼氱瓑绾у埗搴︽槸锛?, options: ['绉嶅鍒跺害', '鍒嗗皝鍒?, '閮″幙鍒?, '绉戜妇鍒?], answerIndex: 0, explanation: '绠€鍗曪細绉嶅鍒跺害銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害鐨勫洓涓瓑绾т腑锛屾渶楂樼瓑绾ф槸锛?, options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 0, explanation: '涓瓑锛氬﹩缃楅棬銆? },
      { id: 'q5', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害鐨勫洓涓瓑绾т腑锛屾帉绠″啗浜嬪拰琛屾斂鏉冨姏鐨勬槸锛?, options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 1, explanation: '涓瓑锛氬埞甯濆埄銆? },
      { id: 'q6', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害鐨勫洓涓瓑绾т腑锛屼粠浜嬪啘涓氥€佺暅鐗т笟鍜屽晢涓氱殑鏄紵', options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 2, explanation: '涓瓑锛氬悹鑸嶃€? },
      { id: 'q7', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害鐨勫洓涓瓑绾т腑锛屼富瑕佺敱琚緛鏈嶅眳姘戞瀯鎴愶紝浠庝簨鍐滀笟銆佺暅鐗т笟銆佹崟楸间笟鍜屾墜宸ヤ笟鐨勬槸锛?, options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 3, explanation: '涓瓑锛氶闄€缃椼€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'indus', prompt: '锛堜腑鑰冪湡棰橈級鍙や唬鍗板害鏂囨槑鏈€鏃╁嚭鐜板湪锛?, options: ['鍗板害娌虫祦鍩?, '灏肩綏娌虫祦鍩?, '涓ゆ渤娴佸煙', '榛勬渤娴佸煙'], answerIndex: 0, explanation: '鐪熼锛氬嵃搴︽渤娴佸煙銆? },
      { id: 'q9', knowledgePointId: 'caste', prompt: '锛堜腑鑰冪湡棰橈級鍙や唬鍗板害鐨勭濮撳埗搴︿腑锛屾帉绠＄キ绁€鐨勭瓑绾ф槸锛?, options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 0, explanation: '鐪熼锛氬﹩缃楅棬銆? },
      { id: 'q10', knowledgePointId: 'caste', prompt: '锛堜腑鑰冪湡棰橈級鍙や唬鍗板害鐨勭濮撳埗搴﹀疄璐ㄦ槸锛?, options: ['涓ユ牸鐨勭ぞ浼氱瓑绾у埗搴?, '姘戜富鍒跺害', '骞崇瓑鍒跺害', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氫弗鏍肩殑绀句細绛夌骇鍒跺害銆? },
    ],
  },
  {
    id: 'his-8a-2', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '浜烘暀鐗?, section: '绗?璇?绗簩娆￠甫鐗囨垬浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his8a', locator: 'p2' },
    knowledgePoints: [
      { id: 'second', title: '绗簩娆￠甫鐗囨垬浜?, content: '1856骞?0鏈堬紝鑻卞啗鐐桨骞垮窞锛屾寫璧锋垬浜夈€?860骞达紝鑻辨硶鑱斿啗鐏儳鍦嗘槑鍥€傛矙淇勪镜鍗犱腑鍥藉寳鏂瑰ぇ鐗囬鍦熴€? },
      { id: 'treaty', title: '銆婂ぉ娲ユ潯绾︺€嬨€婂寳浜潯绾︺€?, content: '銆婂ぉ娲ユ潯绾︺€嬶細瑗挎柟鍒楀己鑾峰緱浜嗗鍥藉叕浣胯繘椹诲寳浜紝澧炲紑姹夊彛銆佸崡浜瓑鍗佸涓洪€氬晢鍙ｅ哺锛屽鍥藉晢鑸瑰拰鍐涜埌鍙互鍦ㄩ暱姹熷悇鍙ｅ哺鑷敱鑸绛夌壒鏉冦€傘€婂寳浜潯绾︺€嬶細澧炲紑澶╂触涓哄晢鍩狅紝鍓蹭節榫欏徃鍦版柟涓€鍖虹粰鑻卞浗銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'second', prompt: '绗簩娆￠甫鐗囨垬浜夌垎鍙戜簬鍝竴骞达紵', options: ['1840骞?, '1856骞?, '1860骞?, '1894骞?], answerIndex: 1, explanation: '绠€鍗曪細1856骞淬€? },
      { id: 'q2', knowledgePointId: 'second', prompt: '鐏儳鍦嗘槑鍥殑鏄紵', options: ['鑻辨硶鑱斿啗', '鍏浗鑱斿啗', '鏃ュ啗', '淇勫啗'], answerIndex: 0, explanation: '绠€鍗曪細鑻辨硶鑱斿啗銆? },
      { id: 'q3', knowledgePointId: 'second', prompt: '鐏儳鍦嗘槑鍥彂鐢熷湪鍝竴骞达紵', options: ['1856骞?, '1860骞?, '1840骞?, '1894骞?], answerIndex: 1, explanation: '绠€鍗曪細1860骞淬€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'treaty', prompt: '銆婂ぉ娲ユ潯绾︺€嬬璁簬鍝竴骞达紵', options: ['1858骞?, '1860骞?, '1842骞?, '1895骞?], answerIndex: 0, explanation: '涓瓑锛?858骞淬€? },
      { id: 'q5', knowledgePointId: 'treaty', prompt: '銆婂寳浜潯绾︺€嬪寮€鍝噷涓哄晢鍩狅紵', options: ['澶╂触', '涓婃捣', '骞垮窞', '鍗椾含'], answerIndex: 0, explanation: '涓瓑锛氬ぉ娲ャ€? },
      { id: 'q6', knowledgePointId: 'treaty', prompt: '銆婂寳浜潯绾︺€嬪壊璁╃粰鑻卞浗鐨勬槸锛?, options: ['涔濋緳鍙稿湴鏂逛竴鍖?, '棣欐腐宀?, '鏂扮晫', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫節榫欏徃鍦版柟涓€鍖恒€? },
      { id: 'q7', knowledgePointId: 'second', prompt: '绗簩娆￠甫鐗囨垬浜変腑锛屼镜鍗犱腑鍥藉寳鏂瑰ぇ鐗囬鍦熺殑鍥藉鏄紵', options: ['鑻卞浗', '娉曞浗', '娌欎縿', '缇庡浗'], answerIndex: 2, explanation: '涓瓑锛氭矙淇勩€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'second', prompt: '锛堜腑鑰冪湡棰橈級鐏儳鍦嗘槑鍥彂鐢熷湪锛?, options: ['楦︾墖鎴樹簤', '绗簩娆￠甫鐗囨垬浜?, '鐢插崍涓棩鎴樹簤', '鍏浗鑱斿啗渚靛崕鎴樹簤'], answerIndex: 1, explanation: '鐪熼锛氱浜屾楦︾墖鎴樹簤銆? },
      { id: 'q9', knowledgePointId: 'treaty', prompt: '锛堜腑鑰冪湡棰橈級銆婂ぉ娲ユ潯绾︺€嬬璁簬锛?, options: ['1858骞?, '1860骞?, '1842骞?, '1895骞?], answerIndex: 0, explanation: '鐪熼锛?858骞淬€? },
      { id: 'q10', knowledgePointId: 'second', prompt: '锛堜腑鑰冪湡棰橈級绗簩娆￠甫鐗囨垬浜変腑锛屾矙淇勪镜鍗犱腑鍥藉寳鏂归鍦熺害锛?, options: ['100澶氫竾骞虫柟鍗冪背', '150澶氫竾骞虫柟鍗冪背', '200澶氫竾骞虫柟鍗冪背', '浠ヤ笂閮戒笉瀵?], answerIndex: 1, explanation: '鐪熼锛?50澶氫竾骞虫柟鍗冪背銆? },
    ],
  },
  {
    id: 'his-9a-2', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙や唬浜氶潪鏂囨槑', edition: '浜烘暀鐗?, section: '绗?璇?鍙や唬涓ゆ渤娴佸煙',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his9a', locator: 'p2' },
    knowledgePoints: [
      { id: 'mesopotamia', title: '鍙や唬涓ゆ渤娴佸煙', content: '涓ゆ渤娴佸煙鏄寚瑗夸簹鐨勫辜鍙戞媺搴曟渤涓庡簳鏍奸噷鏂渤銆傚叕鍏冨墠3500骞翠互鍚庯紝鑻忕編灏斾汉鍦ㄤ袱娌虫祦鍩熷崡閮ㄥ缓绔嬭捣寰堝濂撮毝鍒跺皬鍥姐€? },
      { id: 'hammurabi', title: '姹夎盁鎷夋瘮娉曞吀', content: '鍏厓鍓?8涓栫邯锛屽彜宸存瘮浼︾帇鍥藉浗鐜嬫眽璋熸媺姣旂粺涓€浜嗕袱娌虫祦鍩熴€傛眽璋熸媺姣旀硶鍏告槸杩勪粖宸茬煡涓栫晫涓婄涓€閮ㄨ緝涓哄畬鏁寸殑鎴愭枃娉曞吀銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'mesopotamia', prompt: '涓ゆ渤娴佸煙鏄寚锛?, options: ['骞煎彂鎷夊簳娌充笌搴曟牸閲屾柉娌?, '灏肩綏娌充笌鍦颁腑娴?, '鍗板害娌充笌鎭掓渤', '榛勬渤涓庨暱姹?], answerIndex: 0, explanation: '绠€鍗曪細骞煎彂鎷夊簳娌充笌搴曟牸閲屾柉娌炽€? },
      { id: 'q2', knowledgePointId: 'hammurabi', prompt: '姹夎盁鎷夋瘮鏄摢涓浗瀹剁殑鍥界帇锛?, options: ['鍙ゅ反姣斾鸡鐜嬪浗', '鍙ゅ焹鍙?, '鍙ゅ嵃搴?, '鍙ゅ笇鑵?], answerIndex: 0, explanation: '绠€鍗曪細鍙ゅ反姣斾鸡鐜嬪浗銆? },
      { id: 'q3', knowledgePointId: 'hammurabi', prompt: '姹夎盁鎷夋瘮娉曞吀鏄縿浠婂凡鐭ヤ笘鐣屼笂绗竴閮ㄨ緝涓哄畬鏁寸殑锛?, options: ['鎴愭枃娉曞吀', '瀹硶', '姘戞硶', '鍒戞硶'], answerIndex: 0, explanation: '绠€鍗曪細鎴愭枃娉曞吀銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'mesopotamia', prompt: '涓ゆ渤娴佸煙浣嶄簬锛?, options: ['瑗夸簹', '鍖楅潪', '鍗椾簹', '涓滀簹'], answerIndex: 0, explanation: '涓瓑锛氳タ浜氥€? },
      { id: 'q5', knowledgePointId: 'hammurabi', prompt: '姹夎盁鎷夋瘮缁熶竴涓ゆ渤娴佸煙鏄湪锛?, options: ['鍏厓鍓?8涓栫邯', '鍏厓鍓?6涓栫邯', '鍏厓鍓?0涓栫邯', '鍏厓鍓?2涓栫邯'], answerIndex: 0, explanation: '涓瓑锛氬叕鍏冨墠18涓栫邯銆? },
      { id: 'q6', knowledgePointId: 'mesopotamia', prompt: '鍏厓鍓?500骞翠互鍚庯紝鍦ㄤ袱娌虫祦鍩熷崡閮ㄥ缓绔嬭捣寰堝濂撮毝鍒跺皬鍥界殑鏄紵', options: ['鑻忕編灏斾汉', '闃垮崱寰蜂汉', '宸存瘮浼︿汉', '浜氳堪浜?], answerIndex: 0, explanation: '涓瓑锛氳嫃缇庡皵浜恒€? },
      { id: 'q7', knowledgePointId: 'hammurabi', prompt: '姹夎盁鎷夋瘮娉曞吀鍒诲湪锛?, options: ['鐭虫煴涓?, '鐭崇涓?, '鏈ㄦ澘涓?, '绔圭畝涓?], answerIndex: 0, explanation: '涓瓑锛氱煶鏌变笂銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'hammurabi', prompt: '锛堜腑鑰冪湡棰橈級杩勪粖宸茬煡涓栫晫涓婄涓€閮ㄨ緝涓哄畬鏁寸殑鎴愭枃娉曞吀鏄紵', options: ['姹夎盁鎷夋瘮娉曞吀', '鍗佷簩閾滆〃娉?, '鏌ュ＋涓佸凹娉曞吀', '鎷跨牬浠戞硶鍏?], answerIndex: 0, explanation: '鐪熼锛氭眽璋熸媺姣旀硶鍏搞€? },
      { id: 'q9', knowledgePointId: 'mesopotamia', prompt: '锛堜腑鑰冪湡棰橈級涓ゆ渤娴佸煙鏄寚锛?, options: ['骞煎彂鎷夊簳娌充笌搴曟牸閲屾柉娌?, '灏肩綏娌充笌鍦颁腑娴?, '鍗板害娌充笌鎭掓渤', '榛勬渤涓庨暱姹?], answerIndex: 0, explanation: '鐪熼锛氬辜鍙戞媺搴曟渤涓庡簳鏍奸噷鏂渤銆? },
      { id: 'q10', knowledgePointId: 'hammurabi', prompt: '锛堜腑鑰冪湡棰橈級姹夎盁鎷夋瘮鏄摢涓浗瀹剁殑鍥界帇锛?, options: ['鍙ゅ反姣斾鸡鐜嬪浗', '鍙ゅ焹鍙?, '鍙ゅ嵃搴?, '鍙ゅ笇鑵?], answerIndex: 0, explanation: '鐪熼锛氬彜宸存瘮浼︾帇鍥姐€? },
    ],
  },
  {
    id: 'his-8a-3', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '浜烘暀鐗?, section: '绗?璇?澶钩澶╁浗杩愬姩',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his8a', locator: 'p3' },
    knowledgePoints: [
      { id: 'taiping', title: '澶钩澶╁浗杩愬姩', content: '1851骞?鏈?1鏃ワ紝娲鍏ㄥ湪骞胯タ妗傚钩鍘块噾鐢版潙鍙戝姩姝﹁璧蜂箟锛屽缓鍙峰お骞冲ぉ鍥姐€?853骞?鏈堬紝鏀诲崰鍗椾含锛屽皢鍗椾含鏀瑰悕涓哄ぉ浜紝浣滀负閮藉煄銆? },
      { id: 'tianjing', title: '銆婂ぉ鏈濈敯浜╁埗搴︺€?, content: '銆婂ぉ鏈濈敯浜╁埗搴︺€嬫槸澶钩澶╁浗鐨勭翰棰嗘€ф枃浠讹紝鍙嶆槧浜嗗啘姘戣姹傚簾闄ゅ皝寤哄湡鍦版墍鏈夊埗鐨勫己鐑堟効鏈涖€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩鐨勯琚栨槸锛?, options: ['娲鍏?, '鏉ㄧ娓?, '鐭宠揪寮€', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細娲鍏ㄣ€? },
      { id: 'q2', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩鐖嗗彂浜庡摢涓€骞达紵', options: ['1851骞?, '1853骞?, '1856骞?, '1864骞?], answerIndex: 0, explanation: '绠€鍗曪細1851骞淬€? },
      { id: 'q3', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩鐖嗗彂浜庡摢閲岋紵', options: ['骞胯タ妗傚钩閲戠敯鏉?, '骞夸笢骞垮窞', '姹熻嫃鍗椾含', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細骞胯タ妗傚钩閲戠敯鏉戙€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗鐨勯兘鍩庢槸锛?, options: ['澶╀含', '鍖椾含', '鍗椾含', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬ぉ浜紙鍗椾含锛夈€? },
      { id: 'q5', knowledgePointId: 'tianjing', prompt: '澶钩澶╁浗鐨勭翰棰嗘€ф枃浠舵槸锛?, options: ['銆婂ぉ鏈濈敯浜╁埗搴︺€?, '銆婅祫鏀挎柊绡囥€?, '銆婁腑鍗庢皯鍥戒复鏃剁害娉曘€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婂ぉ鏈濈敯浜╁埗搴︺€嬨€? },
      { id: 'q6', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩澶辫触浜庡摢涓€骞达紵', options: ['1864骞?, '1856骞?, '1853骞?, '1851骞?], answerIndex: 0, explanation: '涓瓑锛?864骞淬€? },
      { id: 'q7', knowledgePointId: 'tianjing', prompt: '銆婂ぉ鏈濈敯浜╁埗搴︺€嬪弽鏄犱簡鍐滄皯瑕佹眰搴熼櫎浠€涔堢殑寮虹儓鎰挎湜锛?, options: ['灏佸缓鍦熷湴鎵€鏈夊埗', '灏佸缓鍒跺害', '璧勬湰涓讳箟鍒跺害', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬皝寤哄湡鍦版墍鏈夊埗銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'taiping', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗杩愬姩鐨勯琚栨槸锛?, options: ['娲鍏?, '鏉ㄧ娓?, '鐭宠揪寮€', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭椽绉€鍏ㄣ€? },
      { id: 'q9', knowledgePointId: 'taiping', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗杩愬姩鐖嗗彂浜庡摢涓€骞达紵', options: ['1851骞?, '1853骞?, '1856骞?, '1864骞?], answerIndex: 0, explanation: '鐪熼锛?851骞淬€? },
      { id: 'q10', knowledgePointId: 'tianjing', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗鐨勭翰棰嗘€ф枃浠舵槸锛?, options: ['銆婂ぉ鏈濈敯浜╁埗搴︺€?, '銆婅祫鏀挎柊绡囥€?, '銆婁腑鍗庢皯鍥戒复鏃剁害娉曘€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氥€婂ぉ鏈濈敯浜╁埗搴︺€嬨€? },
    ],
  },
  {
    id: 'his-9a-3', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙や唬浜氶潪鏂囨槑', edition: '浜烘暀鐗?, section: '绗?璇?鍙や唬鍗板害',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his9a', locator: 'p3' },
    knowledgePoints: [
      { id: 'india', title: '鍙や唬鍗板害', content: '鍙や唬鍗板害鍦ㄥ湴鐞嗕笂鏄寚浠婂ぉ鐨勫崡浜氭澶ч檰銆傚彜浠ｅ嵃搴︽枃鏄庢渶鏃╁嚭鐜颁簬鍗板害娌虫祦鍩熴€傚叕鍏冨墠1500骞村乏鍙筹紝闆呭埄瀹変汉渚靛叆鍗板害锛岄€愭笎寤虹珛璧疯澶氬皬鍥藉銆? },
      { id: 'caste', title: '绉嶅鍒跺害', content: '闆呭埄瀹変汉杩涘叆鍗板害鍚庯紝閫愭笎寤虹珛浜嗕弗鏍肩殑绀句細绛夌骇鍒跺害锛屽彶绉?绉嶅鍒跺害"銆傜濮撳埗搴﹀洓涓瓑绾э細濠嗙綏闂ㄣ€佸埞甯濆埄銆佸悹鑸嶃€侀闄€缃椼€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'india', prompt: '鍙や唬鍗板害鏂囨槑鏈€鏃╁嚭鐜颁簬锛?, options: ['鍗板害娌虫祦鍩?, '鎭掓渤娴佸煙', '灏肩綏娌虫祦鍩?, '涓ゆ渤娴佸煙'], answerIndex: 0, explanation: '绠€鍗曪細鍗板害娌虫祦鍩熴€? },
      { id: 'q2', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害鏄摢涓浗瀹剁殑锛?, options: ['鍙や唬鍗板害', '鍙や唬鍩冨強', '鍙ゅ反姣斾鸡', '鍙や唬涓浗'], answerIndex: 0, explanation: '绠€鍗曪細鍙や唬鍗板害銆? },
      { id: 'q3', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害绗竴绛夌骇鏄紵', options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 0, explanation: '绠€鍗曪細濠嗙綏闂ㄣ€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害绗簩绛夌骇鏄紵', options: ['鍒瑰笣鍒?, '濠嗙綏闂?, '鍚犺垗', '棣栭檧缃?], answerIndex: 0, explanation: '涓瓑锛氬埞甯濆埄銆? },
      { id: 'q5', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害绗笁绛夌骇鏄紵', options: ['鍚犺垗', '濠嗙綏闂?, '鍒瑰笣鍒?, '棣栭檧缃?], answerIndex: 0, explanation: '涓瓑锛氬悹鑸嶃€? },
      { id: 'q6', knowledgePointId: 'caste', prompt: '绉嶅鍒跺害绗洓绛夌骇鏄紵', options: ['棣栭檧缃?, '濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗'], answerIndex: 0, explanation: '涓瓑锛氶闄€缃椼€? },
      { id: 'q7', knowledgePointId: 'india', prompt: '渚靛叆鍙や唬鍗板害鐨勬槸锛?, options: ['闆呭埄瀹変汉', '鑻忕編灏斾汉', '宸存瘮浼︿汉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶泤鍒╁畨浜恒€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'caste', prompt: '锛堜腑鑰冪湡棰橈級绉嶅鍒跺害鏄摢涓浗瀹剁殑锛?, options: ['鍙や唬鍗板害', '鍙や唬鍩冨強', '鍙ゅ反姣斾鸡', '鍙や唬涓浗'], answerIndex: 0, explanation: '鐪熼锛氬彜浠ｅ嵃搴︺€? },
      { id: 'q9', knowledgePointId: 'caste', prompt: '锛堜腑鑰冪湡棰橈級绉嶅鍒跺害绗竴绛夌骇鏄紵', options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 0, explanation: '鐪熼锛氬﹩缃楅棬銆? },
      { id: 'q10', knowledgePointId: 'india', prompt: '锛堜腑鑰冪湡棰橈級鍙や唬鍗板害鏂囨槑鏈€鏃╁嚭鐜颁簬锛?, options: ['鍗板害娌虫祦鍩?, '鎭掓渤娴佸煙', '灏肩綏娌虫祦鍩?, '涓ゆ渤娴佸煙'], answerIndex: 0, explanation: '鐪熼锛氬嵃搴︽渤娴佸煙銆? },
    ],
  },
  {
    id: 'his-8a-4', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 杩戜唬鍖栫殑鏃╂湡鎺㈢储涓庢皯鏃忓嵄鏈虹殑鍔犲墽', edition: '浜烘暀鐗?, section: '绗?璇?娲嬪姟杩愬姩',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his8a', locator: 'p4' },
    knowledgePoints: [
      { id: 'yangwu', title: '娲嬪姟杩愬姩', content: '娲嬪姟杩愬姩鏄?9涓栫邯60骞翠唬鍒?0骞翠唬锛屾磱鍔℃淳鎺€璧风殑涓€鍦?甯堝し闀挎妧浠ュ埗澶?鐨勮嚜鏁戣繍鍔ㄣ€傛磱鍔℃淳涓ぎ浠ｈ〃鏄錅ｏ紝鍦版柟浠ｈ〃鏈夋浘鍥借棭銆佹潕楦跨珷銆佸乏瀹楁銆佸紶涔嬫礊绛夈€? },
      { id: 'content', title: '娲嬪姟杩愬姩鐨勫唴瀹?, content: '娲嬪姟杩愬姩鍓嶆湡浠?鑷己"涓哄彛鍙凤紝鍒涘姙浜嗕竴鎵硅繎浠ｅ啗浜嬪伐涓氾紱鍚庢湡浠?姹傚瘜"涓哄彛鍙凤紝鍒涘姙浜嗕竴鎵硅繎浠ｆ皯鐢ㄥ伐涓氥€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩鐨勫彛鍙锋槸锛?, options: ['甯堝し闀挎妧浠ュ埗澶?, '鑷己銆佹眰瀵?, '姘戜富銆佺瀛?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細甯堝し闀挎妧浠ュ埗澶枫€? },
      { id: 'q2', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩涓ぎ浠ｈ〃鏄紵', options: ['濂曚湥', '鏇惧浗钘?, '鏉庨缚绔?, '宸﹀畻妫?], answerIndex: 0, explanation: '绠€鍗曪細濂曚湥銆? },
      { id: 'q3', knowledgePointId: 'content', prompt: '娲嬪姟杩愬姩鍓嶆湡浠ヤ粈涔堜负鍙ｅ彿锛?, options: ['鑷己', '姹傚瘜', '姘戜富', '绉戝'], answerIndex: 0, explanation: '绠€鍗曪細鑷己銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'content', prompt: '娲嬪姟杩愬姩鍚庢湡浠ヤ粈涔堜负鍙ｅ彿锛?, options: ['姹傚瘜', '鑷己', '姘戜富', '绉戝'], answerIndex: 0, explanation: '涓瓑锛氭眰瀵屻€? },
      { id: 'q5', knowledgePointId: 'yangwu', prompt: '涓嬪垪涓嶅睘浜庢磱鍔℃淳鍦版柟浠ｈ〃鐨勬槸锛?, options: ['濂曚湥', '鏇惧浗钘?, '鏉庨缚绔?, '宸﹀畻妫?], answerIndex: 0, explanation: '涓瓑锛氬錅ｆ槸涓ぎ浠ｈ〃銆? },
      { id: 'q6', knowledgePointId: 'content', prompt: '娲嬪姟杩愬姩鍓嶆湡鍒涘姙鐨勬槸锛?, options: ['杩戜唬鍐涗簨宸ヤ笟', '杩戜唬姘戠敤宸ヤ笟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳繎浠ｅ啗浜嬪伐涓氥€? },
      { id: 'q7', knowledgePointId: 'content', prompt: '娲嬪姟杩愬姩鍚庢湡鍒涘姙鐨勬槸锛?, options: ['杩戜唬姘戠敤宸ヤ笟', '杩戜唬鍐涗簨宸ヤ笟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳繎浠ｆ皯鐢ㄥ伐涓氥€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'yangwu', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩鐨勫彛鍙锋槸锛?, options: ['甯堝し闀挎妧浠ュ埗澶?, '鑷己銆佹眰瀵?, '姘戜富銆佺瀛?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬笀澶烽暱鎶€浠ュ埗澶枫€? },
      { id: 'q9', knowledgePointId: 'yangwu', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩涓ぎ浠ｈ〃鏄紵', options: ['濂曚湥', '鏇惧浗钘?, '鏉庨缚绔?, '宸﹀畻妫?], answerIndex: 0, explanation: '鐪熼锛氬錅ｃ€? },
      { id: 'q10', knowledgePointId: 'content', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩鍓嶆湡浠ヤ粈涔堜负鍙ｅ彿锛?, options: ['鑷己', '姹傚瘜', '姘戜富', '绉戝'], answerIndex: 0, explanation: '鐪熼锛氳嚜寮恒€? },
    ],
  },
  {
    id: 'his-7a-1', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡', edition: '缁熺紪鐗?, section: '绗?璇?杩滃彜鏃舵湡鐨勪汉绫绘椿鍔?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p1' },
    knowledgePoints: [
      { id: 'yuanmou', title: '鍏冭皨浜?, content: '鍏冭皨浜鸿窛浠婄害170涓囧勾锛屾槸鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫汇€? },
      { id: 'beijing', title: '鍖椾含浜?, content: '鍖椾含浜鸿窛浠婄害70涓団€?0涓囧勾锛岀敓娲诲湪鍖椾含瑗垮崡鍛ㄥ彛搴椾竴甯︼紝浼氫娇鐢ㄥぉ鐒剁伀锛屼細淇濆瓨鐏銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'yuanmou', prompt: '鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫绘槸锛?, options: ['鍏冭皨浜?, '鍖椾含浜?, '灞遍《娲炰汉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏冭皨浜恒€? },
      { id: 'q2', knowledgePointId: 'yuanmou', prompt: '鍏冭皨浜鸿窛浠婄害澶氬皯骞达紵', options: ['170涓囧勾', '70涓囧勾', '20涓囧勾', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細170涓囧勾銆? },
      { id: 'q3', knowledgePointId: 'beijing', prompt: '鍖椾含浜虹敓娲诲湪鍝噷锛?, options: ['鍖椾含瑗垮崡鍛ㄥ彛搴?, '浜戝崡鍏冭皨', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍖椾含瑗垮崡鍛ㄥ彛搴椼€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'beijing', prompt: '鍖椾含浜轰細浣跨敤浠€涔堢伀锛?, options: ['澶╃劧鐏?, '浜哄伐鍙栫伀', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬寳浜汉浼氫娇鐢ㄥぉ鐒剁伀銆? },
      { id: 'q5', knowledgePointId: 'beijing', prompt: '鍖椾含浜鸿窛浠婄害澶氬皯骞达紵', options: ['70涓団€?0涓囧勾', '170涓囧勾', '3涓囧勾', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?0涓団€?0涓囧勾銆? },
      { id: 'q6', knowledgePointId: 'yuanmou', prompt: '鍏冭皨浜虹敓娲诲湪浠婂ぉ鐨勫摢涓渷锛?, options: ['浜戝崡', '鍖椾含', '闄曡タ', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫簯鍗椼€? },
      { id: 'q7', knowledgePointId: 'beijing', prompt: '鍖椾含浜轰細淇濆瓨浠€涔堬紵', options: ['鐏', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬寳浜汉浼氫繚瀛樼伀绉嶃€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'yuanmou', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫绘槸锛?, options: ['鍏冭皨浜?, '鍖椾含浜?, '灞遍《娲炰汉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬厓璋嬩汉銆? },
      { id: 'q9', knowledgePointId: 'beijing', prompt: '锛堜腑鑰冪湡棰橈級鍖椾含浜轰細浣跨敤浠€涔堢伀锛?, options: ['澶╃劧鐏?, '浜哄伐鍙栫伀', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬寳浜汉浼氫娇鐢ㄥぉ鐒剁伀銆? },
      { id: 'q10', knowledgePointId: 'beijing', prompt: '锛堜腑鑰冪湡棰橈級鍖椾含浜虹敓娲诲湪鍝噷锛?, options: ['鍖椾含瑗垮崡鍛ㄥ彛搴?, '浜戝崡鍏冭皨', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬寳浜タ鍗楀懆鍙ｅ簵銆? },
    ],
  },
  {
    id: 'his-7a-2', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡', edition: '缁熺紪鐗?, section: '绗?璇?鍘熷鍐滀笟涓庡彶鍓嶇ぞ浼?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p2' },
    knowledgePoints: [
      { id: 'hemu', title: '娌冲娓′汉', content: '娌冲娓′汉鐢熸椿鍦ㄩ暱姹熸祦鍩燂紝璺濅粖绾?000骞达紝绉嶆姘寸ɑ锛屼綇骞叉爮寮忔埧灞嬨€? },
      { id: 'banpo', title: '鍗婂潯浜?, content: '鍗婂潯浜虹敓娲诲湪榛勬渤娴佸煙锛岃窛浠婄害6000骞达紝绉嶆绮燂紝浣忓崐鍦扮┐寮忔埧灞嬨€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'hemu', prompt: '娌冲娓′汉鐢熸椿鍦ㄥ摢涓祦鍩燂紵', options: ['闀挎睙娴佸煙', '榛勬渤娴佸煙', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細闀挎睙娴佸煙銆? },
      { id: 'q2', knowledgePointId: 'banpo', prompt: '鍗婂潯浜虹敓娲诲湪鍝釜娴佸煙锛?, options: ['榛勬渤娴佸煙', '闀挎睙娴佸煙', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細榛勬渤娴佸煙銆? },
      { id: 'q3', knowledgePointId: 'hemu', prompt: '娌冲娓′汉绉嶆浠€涔堬紵', options: ['姘寸ɑ', '绮?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細姘寸ɑ銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'banpo', prompt: '鍗婂潯浜虹妞嶄粈涔堬紵', options: ['绮?, '姘寸ɑ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱矡銆? },
      { id: 'q5', knowledgePointId: 'hemu', prompt: '娌冲娓′汉浣忎粈涔堟埧灞嬶紵', options: ['骞叉爮寮忔埧灞?, '鍗婂湴绌村紡鎴垮眿', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬共鏍忓紡鎴垮眿銆? },
      { id: 'q6', knowledgePointId: 'banpo', prompt: '鍗婂潯浜轰綇浠€涔堟埧灞嬶紵', options: ['鍗婂湴绌村紡鎴垮眿', '骞叉爮寮忔埧灞?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬崐鍦扮┐寮忔埧灞嬨€? },
      { id: 'q7', knowledgePointId: 'hemu', prompt: '娌冲娓′汉璺濅粖绾﹀灏戝勾锛?, options: ['7000骞?, '6000骞?, '5000骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?000骞淬€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'hemu', prompt: '锛堜腑鑰冪湡棰橈級娌冲娓′汉鐢熸椿鍦ㄥ摢涓祦鍩燂紵', options: ['闀挎睙娴佸煙', '榛勬渤娴佸煙', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶暱姹熸祦鍩熴€? },
      { id: 'q9', knowledgePointId: 'banpo', prompt: '锛堜腑鑰冪湡棰橈級鍗婂潯浜虹妞嶄粈涔堬紵', options: ['绮?, '姘寸ɑ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱矡銆? },
      { id: 'q10', knowledgePointId: 'hemu', prompt: '锛堜腑鑰冪湡棰橈級娌冲娓′汉浣忎粈涔堟埧灞嬶紵', options: ['骞叉爮寮忔埧灞?, '鍗婂湴绌村紡鎴垮眿', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬共鏍忓紡鎴垮眿銆? },
    ],
  },
  {
    id: 'his-7a-3', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡', edition: '缁熺紪鐗?, section: '绗?璇?涓崕鏂囨槑鐨勮捣婧?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p3' },
    knowledgePoints: [
      { id: 'huangdi', title: '鐐庡笣鍜岄粍甯?, content: '鐐庡笣鍜岄粍甯濋儴钀借仈鐩熶互鍚庨€愭笎褰㈡垚鍗庡鏃忥紝鍚庝汉灏婂磭鐐庡笣鍜岄粍甯濅负涓崕姘戞棌鐨勪汉鏂囧垵绁栥€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'huangdi', prompt: '鐐庡笣鍜岄粍甯濋儴钀借仈鐩熶互鍚庨€愭笎褰㈡垚浠€涔堟棌锛?, options: ['鍗庡鏃?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗庡鏃忋€? },
      { id: 'q2', knowledgePointId: 'huangdi', prompt: '鍚庝汉灏婂磭鐐庡笣鍜岄粍甯濅负涓崕姘戞棌鐨勪粈涔堬紵', options: ['浜烘枃鍒濈', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細浜烘枃鍒濈銆? },
      { id: 'q3', knowledgePointId: 'huangdi', prompt: '鐐庡笣鍜岄粍甯濊绉颁负浠€涔堬紵', options: ['浜烘枃鍒濈', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細浜烘枃鍒濈銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'huangdi', prompt: '鐐庡笣鍜岄粍甯濈敓娲诲湪浠€涔堟椂鏈燂紵', options: ['璺濅粖绾︿簲鍏崈骞村墠', '璺濅粖绾?70涓囧勾', '璺濅粖绾?0涓囧勾', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳窛浠婄害浜斿叚鍗冨勾鍓嶃€? },
      { id: 'q5', knowledgePointId: 'huangdi', prompt: '鐐庡笣鍜岄粍甯濋儴钀界敓娲诲湪鍝釜娴佸煙锛?, options: ['榛勬渤娴佸煙', '闀挎睙娴佸煙', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶粍娌虫祦鍩熴€? },
      { id: 'q6', knowledgePointId: 'huangdi', prompt: '鎴戜滑鑷О涓轰粈涔堬紵', options: ['鐐庨粍瀛愬瓩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱値榛勫瓙瀛欍€? },
      { id: 'q7', knowledgePointId: 'huangdi', prompt: '灏с€佽垳銆佺鏄€氳繃浠€涔堝埗搴︽垚涓洪儴钀借仈鐩熼棰嗙殑锛?, options: ['绂呰鍒?, '涓栬鍒?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱璁╁埗銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'huangdi', prompt: '锛堜腑鑰冪湡棰橈級鍚庝汉灏婂磭鐐庡笣鍜岄粍甯濅负涓崕姘戞棌鐨勪粈涔堬紵', options: ['浜烘枃鍒濈', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氫汉鏂囧垵绁栥€? },
      { id: 'q9', knowledgePointId: 'huangdi', prompt: '锛堜腑鑰冪湡棰橈級鎴戜滑鑷О涓轰粈涔堬紵', options: ['鐐庨粍瀛愬瓩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱値榛勫瓙瀛欍€? },
      { id: 'q10', knowledgePointId: 'huangdi', prompt: '锛堜腑鑰冪湡棰橈級灏с€佽垳銆佺鏄€氳繃浠€涔堝埗搴︽垚涓洪儴钀借仈鐩熼棰嗙殑锛?, options: ['绂呰鍒?, '涓栬鍒?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱璁╁埗銆? },
    ],
  },
  {
    id: 'his-7a-4', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈?, edition: '缁熺紪鐗?, section: '绗?璇?澶忓晢瑗垮懆鐜嬫湞鐨勬洿鏇?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p4' },
    knowledgePoints: [
      { id: 'xia', title: '澶忔湞', content: '绾﹀叕鍏冨墠2070骞达紝绂瑰缓绔嬪鏈濓紝杩欐槸鎴戝浗鍘嗗彶涓婄涓€涓帇鏈濄€傜姝诲悗锛屽惎缁ф壙鐖朵綅锛屼笘琚埗浠ｆ浛浜嗙璁╁埗銆? },
      { id: 'shang', title: '鍟嗘湞', content: '绾﹀叕鍏冨墠1600骞达紝姹ゅ缓绔嬪晢鏈濄€傚晢鐜嬬洏搴氳縼閮藉埌娈凤紝鍚庝汉鍙堢О鍟嗘湞涓烘鍟嗐€? },
      { id: 'zhou', title: '瑗垮懆', content: '鍏厓鍓?046骞达紝鍛ㄦ鐜嬪缓绔嬪懆鏈濓紝瀹氶兘闀愪含锛屽彶绉拌タ鍛ㄣ€傝タ鍛ㄥ疄琛屽垎灏佸埗銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'xia', prompt: '鎴戝浗鍘嗗彶涓婄涓€涓帇鏈濇槸锛?, options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細澶忔湞銆? },
      { id: 'q2', knowledgePointId: 'xia', prompt: '澶忔湞鐨勫缓绔嬭€呮槸锛?, options: ['绂?, '鍚?, '姹?, '鍛ㄦ鐜?], answerIndex: 0, explanation: '绠€鍗曪細绂广€? },
      { id: 'q3', knowledgePointId: 'shang', prompt: '鍟嗘湞鐨勫缓绔嬭€呮槸锛?, options: ['姹?, '绂?, '鍛ㄦ鐜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細姹ゃ€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'xia', prompt: '涓栬鍒朵唬鏇夸簡浠€涔堝埗搴︼紵', options: ['绂呰鍒?, '鍒嗗皝鍒?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱璁╁埗銆? },
      { id: 'q5', knowledgePointId: 'shang', prompt: '鍟嗙帇鐩樺簹杩侀兘鍒板摢閲岋紵', options: ['娈?, '闀愪含', '娲涢倯', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭銆? },
      { id: 'q6', knowledgePointId: 'zhou', prompt: '瑗垮懆鐨勫缓绔嬭€呮槸锛?, options: ['鍛ㄦ鐜?, '鍛ㄦ枃鐜?, '鍛ㄥ帀鐜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬懆姝︾帇銆? },
      { id: 'q7', knowledgePointId: 'zhou', prompt: '瑗垮懆瀹炶浠€涔堝埗搴︼紵', options: ['鍒嗗皝鍒?, '绂呰鍒?, '涓栬鍒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬垎灏佸埗銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'xia', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗鍘嗗彶涓婄涓€涓帇鏈濇槸锛?, options: ['澶忔湞', '鍟嗘湞', '瑗垮懆', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬鏈濄€? },
      { id: 'q9', knowledgePointId: 'shang', prompt: '锛堜腑鑰冪湡棰橈級鍟嗙帇鐩樺簹杩侀兘鍒板摢閲岋紵', options: ['娈?, '闀愪含', '娲涢倯', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭銆? },
      { id: 'q10', knowledgePointId: 'zhou', prompt: '锛堜腑鑰冪湡棰橈級瑗垮懆瀹炶浠€涔堝埗搴︼紵', options: ['鍒嗗皝鍒?, '绂呰鍒?, '涓栬鍒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬垎灏佸埗銆? },
    ],
  },
  {
    id: 'his-7a-5', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈?, edition: '缁熺紪鐗?, section: '绗?璇?鍔ㄨ崱鍙樺寲涓殑鏄ョ鏃舵湡',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p5' },
    knowledgePoints: [
      { id: 'chunqiu', title: '鏄ョ鏃舵湡', content: '鏄ョ鏃舵湡锛堝叕鍏冨墠770骞粹€斿叕鍏冨墠476骞达級锛屽懆鐜嬪琛板井锛岃渚簤闇搞€傝憲鍚嶉湼涓绘湁榻愭鍏€佹檵鏂囧叕銆佹搴勭帇绛夈€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'chunqiu', prompt: '鏄ョ鏃舵湡寮€濮嬩簬鍝竴骞达紵', options: ['鍏厓鍓?70骞?, '鍏厓鍓?76骞?, '鍏厓鍓?046骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏厓鍓?70骞淬€? },
      { id: 'q2', knowledgePointId: 'chunqiu', prompt: '鏄ョ鏃舵湡锛屽懆鐜嬪鍦颁綅濡備綍锛?, options: ['琛板井', '寮哄ぇ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細琛板井銆? },
      { id: 'q3', knowledgePointId: 'chunqiu', prompt: '鏄ョ鏃舵湡鍑虹幇浜嗕粈涔堝眬闈紵', options: ['璇镐警浜夐湼', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細璇镐警浜夐湼銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'chunqiu', prompt: '涓嬪垪灞炰簬鏄ョ闇镐富鐨勬槸锛?, options: ['榻愭鍏?, '鍛ㄦ鐜?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶綈妗撳叕銆? },
      { id: 'q5', knowledgePointId: 'chunqiu', prompt: '涓嬪垪灞炰簬鏄ョ闇镐富鐨勬槸锛?, options: ['鏅嬫枃鍏?, '鍛ㄦ鐜?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭檵鏂囧叕銆? },
      { id: 'q6', knowledgePointId: 'chunqiu', prompt: '榻愭鍏换鐢ㄨ皝涓虹浉杩涜鏀归潻锛?, options: ['绠′徊', '鍟嗛瀰', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱浠层€? },
      { id: 'q7', knowledgePointId: 'chunqiu', prompt: '鏄ョ鏃舵湡鐨勭涓€涓湼涓绘槸锛?, options: ['榻愭鍏?, '鏅嬫枃鍏?, '妤氬簞鐜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶綈妗撳叕銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'chunqiu', prompt: '锛堜腑鑰冪湡棰橈級鏄ョ鏃舵湡寮€濮嬩簬鍝竴骞达紵', options: ['鍏厓鍓?70骞?, '鍏厓鍓?76骞?, '鍏厓鍓?046骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬叕鍏冨墠770骞淬€? },
      { id: 'q9', knowledgePointId: 'chunqiu', prompt: '锛堜腑鑰冪湡棰橈級榻愭鍏换鐢ㄨ皝涓虹浉杩涜鏀归潻锛?, options: ['绠′徊', '鍟嗛瀰', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱浠层€? },
      { id: 'q10', knowledgePointId: 'chunqiu', prompt: '锛堜腑鑰冪湡棰橈級鏄ョ鏃舵湡鐨勭涓€涓湼涓绘槸锛?, options: ['榻愭鍏?, '鏅嬫枃鍏?, '妤氬簞鐜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶綈妗撳叕銆? },
    ],
  },
  {
    id: 'his-7a-6', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈?, edition: '缁熺紪鐗?, section: '绗?璇?鎴樺浗鏃舵湡鐨勭ぞ浼氬彉闈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p6' },
    knowledgePoints: [
      { id: 'zhanguo', title: '鎴樺浗涓冮泟', content: '鎴樺浗鏃舵湡锛堝叕鍏冨墠475骞粹€斿叕鍏冨墠221骞达級锛屽舰鎴愪簡榻愩€佹銆佺嚂銆侀煩銆佽档銆侀瓘銆佺Е涓冮泟骞剁珛鐨勫眬闈€? },
      { id: 'shangyang', title: '鍟嗛瀰鍙樻硶', content: '鍏厓鍓?56骞达紝鍟嗛瀰鍦ㄧЕ瀛濆叕鏀寔涓嬪紑濮嬪彉娉曘€傚晢闉呭彉娉曚娇绉﹀浗鍥藉姏澶у锛屼负浠ュ悗鍏煎苟鍏浗鎵撲笅浜嗗潥瀹炵殑鍩虹銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'zhanguo', prompt: '鎴樺浗涓冮泟涓嶅寘鎷笅鍒楀摢涓浗瀹讹紵', options: ['鏅?, '榻?, '妤?, '绉?], answerIndex: 0, explanation: '绠€鍗曪細鏅嬪浗鍦ㄦ垬鍥藉垵骞村垎瑁備负闊┿€佽档銆侀瓘涓夊浗銆? },
      { id: 'q2', knowledgePointId: 'shangyang', prompt: '鍟嗛瀰鍙樻硶鍙戠敓鍦ㄥ摢涓浗瀹讹紵', options: ['绉﹀浗', '榻愬浗', '妤氬浗', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細绉﹀浗銆? },
      { id: 'q3', knowledgePointId: 'shangyang', prompt: '鍟嗛瀰鍙樻硶鐨勬椂闂存槸锛?, options: ['鍏厓鍓?56骞?, '鍏厓鍓?70骞?, '鍏厓鍓?75骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏厓鍓?56骞淬€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'shangyang', prompt: '鍟嗛瀰鍙樻硶寰楀埌浜嗚皝鐨勬敮鎸侊紵', options: ['绉﹀瓭鍏?, '绉︾﹩鍏?, '绉﹀鐨?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱Е瀛濆叕銆? },
      { id: 'q5', knowledgePointId: 'shangyang', prompt: '鍟嗛瀰鍙樻硶浣垮摢涓浗瀹跺浗鍔涘ぇ澧烇紵', options: ['绉﹀浗', '榻愬浗', '妤氬浗', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱Е鍥姐€? },
      { id: 'q6', knowledgePointId: 'zhanguo', prompt: '鎴樺浗鏃舵湡寮€濮嬩簬鍝竴骞达紵', options: ['鍏厓鍓?75骞?, '鍏厓鍓?70骞?, '鍏厓鍓?21骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬叕鍏冨墠475骞淬€? },
      { id: 'q7', knowledgePointId: 'shangyang', prompt: '鍟嗛瀰鍙樻硶鐨勬€ц川鏄紵', options: ['灏佸缓鎬ц川鐨勬敼闈?, '濂撮毝鍒舵敼闈?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬皝寤烘€ц川鐨勬敼闈┿€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'shangyang', prompt: '锛堜腑鑰冪湡棰橈級鍟嗛瀰鍙樻硶鍙戠敓鍦ㄥ摢涓浗瀹讹紵', options: ['绉﹀浗', '榻愬浗', '妤氬浗', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱Е鍥姐€? },
      { id: 'q9', knowledgePointId: 'shangyang', prompt: '锛堜腑鑰冪湡棰橈級鍟嗛瀰鍙樻硶寰楀埌浜嗚皝鐨勬敮鎸侊紵', options: ['绉﹀瓭鍏?, '绉︾﹩鍏?, '绉﹀鐨?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱Е瀛濆叕銆? },
      { id: 'q10', knowledgePointId: 'shangyang', prompt: '锛堜腑鑰冪湡棰橈級鍟嗛瀰鍙樻硶浣垮摢涓浗瀹跺浗鍔涘ぇ澧烇紵', options: ['绉﹀浗', '榻愬浗', '妤氬浗', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱Е鍥姐€? },
    ],
  },
  {
    id: 'his-7a-7', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈?, edition: '缁熺紪鐗?, section: '绗?璇?鐧惧浜夐福',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p7' },
    knowledgePoints: [
      { id: 'ru', title: '鍎掑', content: '瀛斿瓙鏄剴瀹跺娲剧殑鍒涘浜猴紝涓诲紶"浠?鍜?绀?銆傚瓱瀛愪富寮?浠佹斂"锛屾彁鍑?姘戣吹鍚涜交"銆? },
      { id: 'dao', title: '閬撳', content: '鑰佸瓙鏄亾瀹跺娲剧殑鍒涘浜猴紝涓诲紶"鏃犱负鑰屾不"锛岃涓轰竴鍒囦簨鐗╅兘鏈夊绔嬮潰銆傚簞瀛愪富寮犻『搴旇嚜鐒躲€? },
      { id: 'fa', title: '娉曞', content: '闊╅潪鏄硶瀹剁殑闆嗗ぇ鎴愯€咃紝涓诲紶鏀归潻锛屾彁鍊℃硶娌伙紝寤虹珛鍚涗富涓撳埗涓ぎ闆嗘潈鐨勫皝寤哄浗瀹躲€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'ru', prompt: '鍎掑瀛︽淳鐨勫垱濮嬩汉鏄紵', options: ['瀛斿瓙', '鑰佸瓙', '闊╅潪', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瀛斿瓙銆? },
      { id: 'q2', knowledgePointId: 'dao', prompt: '閬撳瀛︽淳鐨勫垱濮嬩汉鏄紵', options: ['鑰佸瓙', '瀛斿瓙', '闊╅潪', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鑰佸瓙銆? },
      { id: 'q3', knowledgePointId: 'fa', prompt: '娉曞鐨勯泦澶ф垚鑰呮槸锛?, options: ['闊╅潪', '瀛斿瓙', '鑰佸瓙', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細闊╅潪銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'ru', prompt: '瀛斿瓙涓诲紶浠€涔堬紵', options: ['"浠?鍜?绀?', '"鏃犱负鑰屾不"', '"娉曟不"', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?浠?鍜?绀?銆? },
      { id: 'q5', knowledgePointId: 'dao', prompt: '鑰佸瓙涓诲紶浠€涔堬紵', options: ['"鏃犱负鑰屾不"', '"浠?鍜?绀?', '"娉曟不"', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?鏃犱负鑰屾不"銆? },
      { id: 'q6', knowledgePointId: 'fa', prompt: '闊╅潪涓诲紶浠€涔堬紵', options: ['鏀归潻锛屾彁鍊℃硶娌?, '"浠?鍜?绀?', '"鏃犱负鑰屾不"', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭敼闈╋紝鎻愬€℃硶娌汇€? },
      { id: 'q7', knowledgePointId: 'ru', prompt: '瀛熷瓙涓诲紶浠€涔堬紵', options: ['"浠佹斂"', '"鏃犱负鑰屾不"', '"娉曟不"', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?浠佹斂"銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'ru', prompt: '锛堜腑鑰冪湡棰橈級鍎掑瀛︽淳鐨勫垱濮嬩汉鏄紵', options: ['瀛斿瓙', '鑰佸瓙', '闊╅潪', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬瓟瀛愩€? },
      { id: 'q9', knowledgePointId: 'dao', prompt: '锛堜腑鑰冪湡棰橈級閬撳瀛︽淳鐨勫垱濮嬩汉鏄紵', options: ['鑰佸瓙', '瀛斿瓙', '闊╅潪', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳€佸瓙銆? },
      { id: 'q10', knowledgePointId: 'fa', prompt: '锛堜腑鑰冪湡棰橈級娉曞鐨勯泦澶ф垚鑰呮槸锛?, options: ['闊╅潪', '瀛斿瓙', '鑰佸瓙', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶煩闈炪€? },
    ],
  },
  {
    id: 'his-7a-8', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈?, edition: '缁熺紪鐗?, section: '绗?璇?澶忓晢鍛ㄦ椂鏈熺殑绉戞妧涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p8' },
    knowledgePoints: [
      { id: 'bronze', title: '闈掗摐鍣?, content: '鍟嗘湞鏄垜鍥介潚閾滄枃鍖栫殑鐏跨儌鏃舵湡銆傝憲鍚嶇殑闈掗摐鍣ㄦ湁鍙告瘝鎴婇紟锛堝悗姣嶆垔榧庯級鍜屽洓缇婃柟灏娿€? },
      { id: 'oracle', title: '鐢查鏂?, content: '鐢查鏂囨槸鍟嗘湞浜哄埢鍐欏湪榫熺敳鎴栧吔楠ㄤ笂鐨勬枃瀛椼€傛垜鍥芥湁鏂囧瓧鍙€冪殑鍘嗗彶浠庡晢鏈濆紑濮嬨€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'bronze', prompt: '鍟嗘湞鏄垜鍥戒粈涔堟枃鍖栫殑鐏跨儌鏃舵湡锛?, options: ['闈掗摐鏂囧寲', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細闈掗摐鏂囧寲銆? },
      { id: 'q2', knowledgePointId: 'bronze', prompt: '钁楀悕鐨勯潚閾滃櫒鏈夛紵', options: ['鍙告瘝鎴婇紟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍙告瘝鎴婇紟銆? },
      { id: 'q3', knowledgePointId: 'oracle', prompt: '鐢查鏂囨槸鍝釜鏈濅唬鐨勬枃瀛楋紵', options: ['鍟嗘湞', '澶忔湞', '瑗垮懆', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍟嗘湞銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'oracle', prompt: '鐢查鏂囨槸鍒诲啓鍦ㄤ粈涔堜笂闈㈢殑鏂囧瓧锛?, options: ['榫熺敳鎴栧吔楠?, '绔圭畝', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶緹鐢叉垨鍏介銆? },
      { id: 'q5', knowledgePointId: 'oracle', prompt: '鎴戝浗鏈夋枃瀛楀彲鑰冪殑鍘嗗彶浠庡摢涓湞浠ｅ紑濮嬶紵', options: ['鍟嗘湞', '澶忔湞', '瑗垮懆', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬晢鏈濄€? },
      { id: 'q6', knowledgePointId: 'bronze', prompt: '鍙告瘝鎴婇紟鏄摢涓湞浠ｇ殑闈掗摐鍣紵', options: ['鍟嗘湞', '澶忔湞', '瑗垮懆', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬晢鏈濄€? },
      { id: 'q7', knowledgePointId: 'bronze', prompt: '鍥涚緤鏂瑰皧鏄摢涓湞浠ｇ殑闈掗摐鍣紵', options: ['鍟嗘湞', '澶忔湞', '瑗垮懆', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬晢鏈濄€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'bronze', prompt: '锛堜腑鑰冪湡棰橈級鍟嗘湞鏄垜鍥戒粈涔堟枃鍖栫殑鐏跨儌鏃舵湡锛?, options: ['闈掗摐鏂囧寲', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶潚閾滄枃鍖栥€? },
      { id: 'q9', knowledgePointId: 'oracle', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗鏈夋枃瀛楀彲鑰冪殑鍘嗗彶浠庡摢涓湞浠ｅ紑濮嬶紵', options: ['鍟嗘湞', '澶忔湞', '瑗垮懆', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬晢鏈濄€? },
      { id: 'q10', knowledgePointId: 'oracle', prompt: '锛堜腑鑰冪湡棰橈級鐢查鏂囨槸鍒诲啓鍦ㄤ粈涔堜笂闈㈢殑鏂囧瓧锛?, options: ['榫熺敳鎴栧吔楠?, '绔圭畝', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶緹鐢叉垨鍏介銆? },
    ],
  },
  {
    id: 'his-7a-9', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡', edition: '缁熺紪鐗?, section: '绗?璇?绉︾粺涓€涓浗',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p9' },
    knowledgePoints: [
      { id: 'qin', title: '绉︾粺涓€涓浗', content: '鍏厓鍓?21骞达紝绉︾帇瀣存斂寤虹珛鎴戝浗鍘嗗彶涓婄涓€涓粺涓€鐨勫姘戞棌鐨勪腑澶泦鏉冪殑灏佸缓鍥藉鈥斺€旂Е鏈濓紝瀹氶兘鍜搁槼銆? },
      { id: 'measure', title: '宸╁浐缁熶竴鐨勬帾鏂?, content: '鏀挎不涓婏細鍒涚珛浜嗕竴濂楀皝寤轰笓鍒朵富涔夌殑涓ぎ闆嗘潈鍒跺害銆傜粡娴庝笂锛氱粺涓€璐у竵銆佺粺涓€搴﹂噺琛°€傛枃鍖栦笂锛氱粺涓€鏂囧瓧銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'qin', prompt: '绉︽湞寤虹珛浜庡摢涓€骞达紵', options: ['鍏厓鍓?21骞?, '鍏厓鍓?30骞?, '鍏厓鍓?07骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏厓鍓?21骞淬€? },
      { id: 'q2', knowledgePointId: 'qin', prompt: '绉︽湞鐨勫缓绔嬭€呮槸锛?, options: ['瀣存斂', '瀣存壎鑻?, '鑳′亥', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瀣存斂銆? },
      { id: 'q3', knowledgePointId: 'qin', prompt: '绉︽湞鐨勯兘鍩庢槸锛?, options: ['鍜搁槼', '闀垮畨', '娲涢槼', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍜搁槼銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'qin', prompt: '绉︽湞鏄垜鍥藉巻鍙蹭笂绗竴涓粈涔堟牱鐨勫浗瀹讹紵', options: ['缁熶竴鐨勫姘戞棌鐨勪腑澶泦鏉冪殑灏佸缓鍥藉', '濂撮毝鍒跺浗瀹?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱粺涓€鐨勫姘戞棌鐨勪腑澶泦鏉冪殑灏佸缓鍥藉銆? },
      { id: 'q5', knowledgePointId: 'measure', prompt: '绉︽湞鍦ㄦ斂娌讳笂鍒涚珛浜嗕粈涔堝埗搴︼紵', options: ['灏佸缓涓撳埗涓讳箟鐨勪腑澶泦鏉冨埗搴?, '鍒嗗皝鍒?, '绂呰鍒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬皝寤轰笓鍒朵富涔夌殑涓ぎ闆嗘潈鍒跺害銆? },
      { id: 'q6', knowledgePointId: 'measure', prompt: '绉︽湞鍦ㄧ粡娴庝笂缁熶竴浜嗕粈涔堬紵', options: ['璐у竵鍜屽害閲忚　', '鏂囧瓧', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳揣甯佸拰搴﹂噺琛°€? },
      { id: 'q7', knowledgePointId: 'measure', prompt: '绉︽湞鍦ㄦ枃鍖栦笂缁熶竴浜嗕粈涔堬紵', options: ['鏂囧瓧', '璐у竵', '搴﹂噺琛?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭枃瀛椼€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'qin', prompt: '锛堜腑鑰冪湡棰橈級绉︽湞寤虹珛浜庡摢涓€骞达紵', options: ['鍏厓鍓?21骞?, '鍏厓鍓?30骞?, '鍏厓鍓?07骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬叕鍏冨墠221骞淬€? },
      { id: 'q9', knowledgePointId: 'qin', prompt: '锛堜腑鑰冪湡棰橈級绉︽湞鐨勫缓绔嬭€呮槸锛?, options: ['瀣存斂', '瀣存壎鑻?, '鑳′亥', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬鏀裤€? },
      { id: 'q10', knowledgePointId: 'measure', prompt: '锛堜腑鑰冪湡棰橈級绉︽湞鍦ㄦ斂娌讳笂鍒涚珛浜嗕粈涔堝埗搴︼紵', options: ['灏佸缓涓撳埗涓讳箟鐨勪腑澶泦鏉冨埗搴?, '鍒嗗皝鍒?, '绂呰鍒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬皝寤轰笓鍒朵富涔夌殑涓ぎ闆嗘潈鍒跺害銆? },
    ],
  },
  {
    id: 'his-7a-10', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡', edition: '缁熺紪鐗?, section: '绗?0璇?绉︽湯鍐滄皯澶ц捣涔?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p10' },
    knowledgePoints: [
      { id: 'qinyang', title: '绉︾殑鏆存斂', content: '绉︽湞鐨勬毚鏀胯〃鐜板湪锛氳祴绋庣箒閲嶃€佸经褰瑰叺褰圭箒閲嶃€佸垜娉曟畫閰枫€傜Е浜屼笘鏇村姞娈嬫毚銆? },
      { id: 'qiyi', title: '闄堣儨鍚村箍璧蜂箟', content: '鍏厓鍓?09骞达紝闄堣儨銆佸惔骞垮湪澶ф辰涔¤捣涔夛紝杩欐槸鎴戝浗鍘嗗彶涓婄涓€娆″ぇ瑙勬ā鐨勫啘姘戣捣涔夈€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'qinyang', prompt: '绉︽湞鐨勬毚鏀胯〃鐜板湪锛?, options: ['璧嬬◣绻侀噸', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細璧嬬◣绻侀噸銆? },
      { id: 'q2', knowledgePointId: 'qiyi', prompt: '闄堣儨鍚村箍璧蜂箟鍙戠敓鍦ㄥ摢涓€骞达紵', options: ['鍏厓鍓?09骞?, '鍏厓鍓?21骞?, '鍏厓鍓?07骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏厓鍓?09骞淬€? },
      { id: 'q3', knowledgePointId: 'qiyi', prompt: '闄堣儨鍚村箍璧蜂箟鐨勫湴鐐规槸锛?, options: ['澶ф辰涔?, '鍜搁槼', '闀垮畨', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細澶ф辰涔°€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'qiyi', prompt: '鎴戝浗鍘嗗彶涓婄涓€娆″ぇ瑙勬ā鐨勫啘姘戣捣涔夋槸锛?, options: ['闄堣儨鍚村箍璧蜂箟', '鍒橀偊椤圭窘璧蜂箟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶檲鑳滃惔骞胯捣涔夈€? },
      { id: 'q5', knowledgePointId: 'qinyang', prompt: '绉︽湞鐨勬毚鏀夸笉鍖呮嫭锛?, options: ['杞诲经钖勮祴', '璧嬬◣绻侀噸', '寰焦鍏靛焦绻侀噸', '鍒戞硶娈嬮叿'], answerIndex: 0, explanation: '涓瓑锛氳交寰杽璧嬫槸浠佹斂锛屼笉鏄毚鏀裤€? },
      { id: 'q6', knowledgePointId: 'qiyi', prompt: '闄堣儨鍚村箍璧蜂箟鐨勫彛鍙锋槸锛?, options: ['鐜嬩警灏嗙浉锛屽畞鏈夌涔?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱帇渚皢鐩革紝瀹佹湁绉嶄箮銆? },
      { id: 'q7', knowledgePointId: 'qiyi', prompt: '绉︽湞鐏骸浜庡摢涓€骞达紵', options: ['鍏厓鍓?07骞?, '鍏厓鍓?09骞?, '鍏厓鍓?21骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬叕鍏冨墠207骞淬€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'qiyi', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗鍘嗗彶涓婄涓€娆″ぇ瑙勬ā鐨勫啘姘戣捣涔夋槸锛?, options: ['闄堣儨鍚村箍璧蜂箟', '鍒橀偊椤圭窘璧蜂箟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶檲鑳滃惔骞胯捣涔夈€? },
      { id: 'q9', knowledgePointId: 'qiyi', prompt: '锛堜腑鑰冪湡棰橈級闄堣儨鍚村箍璧蜂箟鍙戠敓鍦ㄥ摢涓€骞达紵', options: ['鍏厓鍓?09骞?, '鍏厓鍓?21骞?, '鍏厓鍓?07骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬叕鍏冨墠209骞淬€? },
      { id: 'q10', knowledgePointId: 'qinyang', prompt: '锛堜腑鑰冪湡棰橈級绉︽湞鐨勬毚鏀胯〃鐜板湪锛?, options: ['璧嬬◣绻侀噸', '杞诲经钖勮祴', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳祴绋庣箒閲嶃€? },
    ],
  },
  {
    id: 'his-7a-11', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡', edition: '缁熺紪鐗?, section: '绗?1璇?瑗挎眽寤虹珛鍜?鏂囨櫙涔嬫不"',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p11' },
    knowledgePoints: [
      { id: 'xihan', title: '瑗挎眽寤虹珛', content: '鍏厓鍓?02骞达紝鍒橀偊寤虹珛姹夋湞锛屽畾閮介暱瀹夛紝鍘嗗彶涓婄О涓鸿タ姹夈€傚垬閭﹀氨鏄眽楂樼銆? },
      { id: 'wenjing', title: '鏂囨櫙涔嬫不', content: '姹夋枃甯濆拰姹夋櫙甯濇椂鏈燂紝鎻愬€¤妭淇紝閲嶈"浠ュ痉鍖栨皯"锛岀ぞ浼氭瘮杈冨畨瀹氾紝鐧惧瀵岃璧锋潵銆傚巻鍙蹭笂绉拌繖涓€鏃舵湡鐨勭粺娌讳负"鏂囨櫙涔嬫不"銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'xihan', prompt: '瑗挎眽寤虹珛浜庡摢涓€骞达紵', options: ['鍏厓鍓?02骞?, '鍏厓鍓?21骞?, '鍏厓鍓?09骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏厓鍓?02骞淬€? },
      { id: 'q2', knowledgePointId: 'xihan', prompt: '瑗挎眽鐨勫缓绔嬭€呮槸锛?, options: ['鍒橀偊', '椤圭窘', '鍒樺交', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍒橀偊銆? },
      { id: 'q3', knowledgePointId: 'xihan', prompt: '瑗挎眽鐨勯兘鍩庢槸锛?, options: ['闀垮畨', '鍜搁槼', '娲涢槼', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細闀垮畨銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'wenjing', prompt: '"鏂囨櫙涔嬫不"涓殑"鏂囨櫙"鎸囩殑鏄紵', options: ['姹夋枃甯濆拰姹夋櫙甯?, '姹夋枃甯濆拰姹夋甯?, '姹夋櫙甯濆拰姹夋甯?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭眽鏂囧笣鍜屾眽鏅笣銆? },
      { id: 'q5', knowledgePointId: 'wenjing', prompt: '"鏂囨櫙涔嬫不"鏃舵湡鐨勭粺娌绘斂绛栨槸锛?, options: ['鎻愬€¤妭淇紝閲嶈"浠ュ痉鍖栨皯"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭彁鍊¤妭淇紝閲嶈"浠ュ痉鍖栨皯"銆? },
      { id: 'q6', knowledgePointId: 'xihan', prompt: '鍒橀偊灏辨槸锛?, options: ['姹夐珮绁?, '姹夋枃甯?, '姹夋甯?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭眽楂樼銆? },
      { id: 'q7', knowledgePointId: 'wenjing', prompt: '"鏂囨櫙涔嬫不"鏄摢涓湞浠ｇ殑娌讳笘灞€闈紵', options: ['瑗挎眽', '涓滄眽', '绉︽湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳タ姹夈€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'xihan', prompt: '锛堜腑鑰冪湡棰橈級瑗挎眽寤虹珛浜庡摢涓€骞达紵', options: ['鍏厓鍓?02骞?, '鍏厓鍓?21骞?, '鍏厓鍓?09骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬叕鍏冨墠202骞淬€? },
      { id: 'q9', knowledgePointId: 'xihan', prompt: '锛堜腑鑰冪湡棰橈級瑗挎眽鐨勫缓绔嬭€呮槸锛?, options: ['鍒橀偊', '椤圭窘', '鍒樺交', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬垬閭︺€? },
      { id: 'q10', knowledgePointId: 'wenjing', prompt: '锛堜腑鑰冪湡棰橈級"鏂囨櫙涔嬫不"涓殑"鏂囨櫙"鎸囩殑鏄紵', options: ['姹夋枃甯濆拰姹夋櫙甯?, '姹夋枃甯濆拰姹夋甯?, '姹夋櫙甯濆拰姹夋甯?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭眽鏂囧笣鍜屾眽鏅笣銆? },
    ],
  },
  {
    id: 'his-7a-12', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡', edition: '缁熺紪鐗?, section: '绗?2璇?澶т竴缁熺帇鏈濈殑宸╁浐',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p12' },
    knowledgePoints: [
      { id: 'hanwu', title: '姹夋甯濈殑澶т竴缁?, content: '姹夋甯濇帴鍙楄懀浠茶垝鐨勫缓璁紝"缃㈤粶鐧惧锛岀嫭灏婂剴鏈?锛屾妸鍎掑瀛﹁浣滀负灏佸缓姝ｇ粺鎬濇兂銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'hanwu', prompt: '姹夋甯濇帴鍙椾簡璋佺殑寤鸿锛?, options: ['钁ｄ徊鑸?, '鍗潚', '闇嶅幓鐥?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細钁ｄ徊鑸掋€? },
      { id: 'q2', knowledgePointId: 'hanwu', prompt: '姹夋甯濈殑寤鸿鏄紵', options: ['"缃㈤粶鐧惧锛岀嫭灏婂剴鏈?', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細"缃㈤粶鐧惧锛岀嫭灏婂剴鏈?銆? },
      { id: 'q3', knowledgePointId: 'hanwu', prompt: '姹夋甯濇妸浠€涔堝璇翠綔涓哄皝寤烘缁熸€濇兂锛?, options: ['鍎掑', '閬撳', '娉曞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍎掑銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'hanwu', prompt: '姹夋甯濇椂鏈燂紝澶ц触鍖堝ゴ鐨勫ぇ灏嗘槸锛?, options: ['鍗潚鍜岄湇鍘荤梾', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬崼闈掑拰闇嶅幓鐥呫€? },
      { id: 'q5', knowledgePointId: 'hanwu', prompt: '姹夋甯濇椂鏈燂紝姹夋湞杩涘叆浜嗕粈涔堟椂鏈燂紵', options: ['榧庣洓鏃舵湡', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶紟鐩涙椂鏈熴€? },
      { id: 'q6', knowledgePointId: 'hanwu', prompt: '姹夋甯濇槸鍝釜鏈濅唬鐨勭殗甯濓紵', options: ['瑗挎眽', '涓滄眽', '绉︽湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳タ姹夈€? },
      { id: 'q7', knowledgePointId: 'hanwu', prompt: '"缃㈤粶鐧惧锛岀嫭灏婂剴鏈?鐨勫缓璁槸璋佹彁鍑虹殑锛?, options: ['钁ｄ徊鑸?, '鍗潚', '闇嶅幓鐥?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳懀浠茶垝銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'hanwu', prompt: '锛堜腑鑰冪湡棰橈級姹夋甯濇帴鍙椾簡璋佺殑寤鸿锛?, options: ['钁ｄ徊鑸?, '鍗潚', '闇嶅幓鐥?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳懀浠茶垝銆? },
      { id: 'q9', knowledgePointId: 'hanwu', prompt: '锛堜腑鑰冪湡棰橈級姹夋甯濇妸浠€涔堝璇翠綔涓哄皝寤烘缁熸€濇兂锛?, options: ['鍎掑', '閬撳', '娉曞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬剴瀹躲€? },
      { id: 'q10', knowledgePointId: 'hanwu', prompt: '锛堜腑鑰冪湡棰橈級姹夋甯濇椂鏈燂紝澶ц触鍖堝ゴ鐨勫ぇ灏嗘槸锛?, options: ['鍗潚鍜岄湇鍘荤梾', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬崼闈掑拰闇嶅幓鐥呫€? },
    ],
  },
  {
    id: 'his-7a-13', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡', edition: '缁熺紪鐗?, section: '绗?3璇?涓滄眽鐨勫叴琛?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p13' },
    knowledgePoints: [
      { id: 'donghan', title: '涓滄眽寤虹珛', content: '鍏厓25骞达紝鍒樼寤虹珛涓滄眽锛屽畾閮芥礇闃炽€傚垬绉€灏辨槸鍏夋甯濄€傚厜姝﹀笣鏈勾锛岀ぞ浼氬畨瀹氾紝缁忔祹鐘跺喌鏄庢樉濂借浆锛屽彶绉拌繖涓椂鏈熺殑缁熸不涓?鍏夋涓叴"銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'donghan', prompt: '涓滄眽寤虹珛浜庡摢涓€骞达紵', options: ['鍏厓25骞?, '鍏厓鍓?02骞?, '鍏厓220骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏厓25骞淬€? },
      { id: 'q2', knowledgePointId: 'donghan', prompt: '涓滄眽鐨勫缓绔嬭€呮槸锛?, options: ['鍒樼', '鍒橀偊', '鍒樺交', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍒樼銆? },
      { id: 'q3', knowledgePointId: 'donghan', prompt: '涓滄眽鐨勯兘鍩庢槸锛?, options: ['娲涢槼', '闀垮畨', '鍜搁槼', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細娲涢槼銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'donghan', prompt: '鍒樼灏辨槸锛?, options: ['鍏夋甯?, '姹夋甯?, '姹夐珮绁?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬厜姝﹀笣銆? },
      { id: 'q5', knowledgePointId: 'donghan', prompt: '"鍏夋涓叴"鏄摢涓湞浠ｇ殑娌讳笘灞€闈紵', options: ['涓滄眽', '瑗挎眽', '绉︽湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫笢姹夈€? },
      { id: 'q6', knowledgePointId: 'donghan', prompt: '涓滄眽鐨勫缓绔嬭€呮槸锛?, options: ['鍒樼', '鍒橀偊', '鍒樺交', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬垬绉€銆? },
      { id: 'q7', knowledgePointId: 'donghan', prompt: '"鍏夋涓叴"涓殑"鍏夋"鎸囩殑鏄紵', options: ['鍏夋甯濆垬绉€', '姹夋甯濆垬褰?, '姹夐珮绁栧垬閭?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬厜姝﹀笣鍒樼銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'donghan', prompt: '锛堜腑鑰冪湡棰橈級涓滄眽寤虹珛浜庡摢涓€骞达紵', options: ['鍏厓25骞?, '鍏厓鍓?02骞?, '鍏厓220骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬叕鍏?5骞淬€? },
      { id: 'q9', knowledgePointId: 'donghan', prompt: '锛堜腑鑰冪湡棰橈級涓滄眽鐨勫缓绔嬭€呮槸锛?, options: ['鍒樼', '鍒橀偊', '鍒樺交', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬垬绉€銆? },
      { id: 'q10', knowledgePointId: 'donghan', prompt: '锛堜腑鑰冪湡棰橈級鍒樼灏辨槸锛?, options: ['鍏夋甯?, '姹夋甯?, '姹夐珮绁?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬厜姝﹀笣銆? },
    ],
  },
  {
    id: 'his-7a-14', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡', edition: '缁熺紪鐗?, section: '绗?4璇?涓濈桓涔嬭矾鐨勫紑閫氫笌缁忚惀瑗垮煙',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p14' },
    knowledgePoints: [
      { id: 'zhangqian', title: '寮犻獮閫氳タ鍩?, content: '鍏厓鍓?38骞村拰鍏厓鍓?19骞达紝姹夋甯濅袱娆℃淳寮犻獮鍑轰娇瑗垮煙锛屽姞寮轰簡姹夋湞涓庤タ鍩熺殑鑱旂郴銆? },
      { id: 'silkroad', title: '涓濈桓涔嬭矾', content: '涓濈桓涔嬭矾浠庨暱瀹夊嚭鍙戯紝閫氳繃娌宠タ璧板粖锛屼粖鏂扮枂鍦板尯锛岃繍寰€瑗夸簹锛屽啀杞繍鍒版娲层€備笣缁镐箣璺槸娌熼€氫腑瑗夸氦閫氱殑闄嗕笂瑕侀亾銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'zhangqian', prompt: '姹夋甯濇淳璋佸嚭浣胯タ鍩燂紵', options: ['寮犻獮', '鐝浐', '鍙搁┈杩?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細寮犻獮銆? },
      { id: 'q2', knowledgePointId: 'silkroad', prompt: '涓濈桓涔嬭矾鐨勮捣鐐规槸锛?, options: ['闀垮畨', '娲涢槼', '鍜搁槼', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細闀垮畨銆? },
      { id: 'q3', knowledgePointId: 'silkroad', prompt: '涓濈桓涔嬭矾鏈€缁堝埌杈惧摢閲岋紵', options: ['娆ф床', '瑗夸簹', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細娆ф床銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'zhangqian', prompt: '寮犻獮绗竴娆″嚭浣胯タ鍩熸槸鍦ㄥ摢涓€骞达紵', options: ['鍏厓鍓?38骞?, '鍏厓鍓?19骞?, '鍏厓鍓?02骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬叕鍏冨墠138骞淬€? },
      { id: 'q5', knowledgePointId: 'zhangqian', prompt: '寮犻獮绗簩娆″嚭浣胯タ鍩熸槸鍦ㄥ摢涓€骞达紵', options: ['鍏厓鍓?19骞?, '鍏厓鍓?38骞?, '鍏厓鍓?02骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬叕鍏冨墠119骞淬€? },
      { id: 'q6', knowledgePointId: 'silkroad', prompt: '涓濈桓涔嬭矾鏄矡閫氫粈涔堜氦閫氱殑闄嗕笂瑕侀亾锛?, options: ['涓タ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫腑瑗裤€? },
      { id: 'q7', knowledgePointId: 'zhangqian', prompt: '瑗垮煙鏄寚浠婂ぉ鐨勪粈涔堝湴鍖猴紵', options: ['鏂扮枂鍦板尯', '瑗胯棌鍦板尯', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭柊鐤嗗湴鍖恒€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'zhangqian', prompt: '锛堜腑鑰冪湡棰橈級姹夋甯濇淳璋佸嚭浣胯タ鍩燂紵', options: ['寮犻獮', '鐝浐', '鍙搁┈杩?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬紶楠炪€? },
      { id: 'q9', knowledgePointId: 'silkroad', prompt: '锛堜腑鑰冪湡棰橈級涓濈桓涔嬭矾鐨勮捣鐐规槸锛?, options: ['闀垮畨', '娲涢槼', '鍜搁槼', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶暱瀹夈€? },
      { id: 'q10', knowledgePointId: 'silkroad', prompt: '锛堜腑鑰冪湡棰橈級涓濈桓涔嬭矾鏈€缁堝埌杈惧摢閲岋紵', options: ['娆ф床', '瑗夸簹', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭娲层€? },
    ],
  },
  {
    id: 'his-7a-15', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡', edition: '缁熺紪鐗?, section: '绗?5璇?绉︽眽鏃舵湡鐨勭鎶€涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p15' },
    knowledgePoints: [
      { id: 'paper', title: '閫犵焊鏈?, content: '涓滄眽鏃舵湡锛岃敗浼︽敼杩涗簡閫犵焊鏈€傞€犵焊鏈殑鍙戞槑鏄垜鍥戒汉姘戝涓栫晫鏂囨槑鐨勫法澶ц础鐚€? },
      { id: 'medical', title: '鍖诲', content: '涓滄眽鏃舵湡锛屽紶浠叉櫙鍐欐垚銆婁激瀵掓潅鐥呰銆嬶紝琚悗涓栧皧绉颁负"鍖诲湥"銆傚崕浣楀埗鎴愬叏韬夯閱夎嵂鍓?楹绘哺鏁?銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'paper', prompt: '鏀硅繘閫犵焊鏈殑鏄紵', options: ['钄′鸡', '寮犱徊鏅?, '鍗庝綏', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細钄′鸡銆? },
      { id: 'q2', knowledgePointId: 'medical', prompt: '琚悗涓栧皧绉颁负"鍖诲湥"鐨勬槸锛?, options: ['寮犱徊鏅?, '鍗庝綏', '钄′鸡', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細寮犱徊鏅€? },
      { id: 'q3', knowledgePointId: 'medical', prompt: '鍒舵垚鍏ㄨ韩楹婚唹鑽墏"楹绘哺鏁?鐨勬槸锛?, options: ['鍗庝綏', '寮犱徊鏅?, '钄′鸡', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗庝綏銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'paper', prompt: '钄′鸡鏄摢涓湞浠ｇ殑浜猴紵', options: ['涓滄眽', '瑗挎眽', '绉︽湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫笢姹夈€? },
      { id: 'q5', knowledgePointId: 'medical', prompt: '寮犱徊鏅啓鎴愪簡浠€涔堜功锛?, options: ['銆婁激瀵掓潅鐥呰銆?, '銆婃湰鑽夌翰鐩€?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婁激瀵掓潅鐥呰銆嬨€? },
      { id: 'q6', knowledgePointId: 'paper', prompt: '閫犵焊鏈殑鍙戞槑鏄垜鍥戒汉姘戝浠€涔堢殑宸ㄥぇ璐＄尞锛?, options: ['涓栫晫鏂囨槑', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫笘鐣屾枃鏄庛€? },
      { id: 'q7', knowledgePointId: 'medical', prompt: '鍗庝綏鏄摢涓湞浠ｇ殑浜猴紵', options: ['涓滄眽', '瑗挎眽', '绉︽湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫笢姹夈€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'paper', prompt: '锛堜腑鑰冪湡棰橈級鏀硅繘閫犵焊鏈殑鏄紵', options: ['钄′鸡', '寮犱徊鏅?, '鍗庝綏', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳敗浼︺€? },
      { id: 'q9', knowledgePointId: 'medical', prompt: '锛堜腑鑰冪湡棰橈級琚悗涓栧皧绉颁负"鍖诲湥"鐨勬槸锛?, options: ['寮犱徊鏅?, '鍗庝綏', '钄′鸡', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬紶浠叉櫙銆? },
      { id: 'q10', knowledgePointId: 'medical', prompt: '锛堜腑鑰冪湡棰橈級鍒舵垚鍏ㄨ韩楹婚唹鑽墏"楹绘哺鏁?鐨勬槸锛?, options: ['鍗庝綏', '寮犱徊鏅?, '钄′鸡', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬崕浣椼€? },
    ],
  },
  {
    id: 'his-7a-16', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈?, edition: '缁熺紪鐗?, section: '绗?6璇?涓夊浗榧庣珛',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p16' },
    knowledgePoints: [
      { id: 'chibi', title: '璧ゅ涔嬫垬', content: '208骞达紝璧ゅ涔嬫垬涓紝瀛欏垬鑱斿啗澶ц触鏇规搷锛屽瀹氫簡涓夊浗榧庣珛灞€闈㈢殑鍩虹銆? },
      { id: 'sanguo', title: '涓夊浗榧庣珛', content: '220骞达紝鏇逛笗寤虹珛榄忥紝瀹氶兘娲涢槼锛?21骞达紝鍒樺寤虹珛铚€锛屽畾閮芥垚閮斤紱222骞达紝瀛欐潈寤虹珛鍚达紝瀹氶兘寤轰笟銆備笁鍥介紟绔嬪眬闈㈠舰鎴愩€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'chibi', prompt: '璧ゅ涔嬫垬鍙戠敓鍦ㄥ摢涓€骞达紵', options: ['208骞?, '220骞?, '221骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細208骞淬€? },
      { id: 'q2', knowledgePointId: 'chibi', prompt: '璧ゅ涔嬫垬涓紝澶ц触鏇规搷鐨勬槸锛?, options: ['瀛欏垬鑱斿啗', '瀛欐潈鍐涢槦', '鍒樺鍐涢槦', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瀛欏垬鑱斿啗銆? },
      { id: 'q3', knowledgePointId: 'sanguo', prompt: '涓夊浗涓嶅寘鎷笅鍒楀摢涓浗瀹讹紵', options: ['绉?, '榄?, '铚€', '鍚?], answerIndex: 0, explanation: '绠€鍗曪細绉︿笉鏄笁鍥戒箣涓€銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'sanguo', prompt: '榄忓浗鐨勫缓绔嬭€呮槸锛?, options: ['鏇逛笗', '鍒樺', '瀛欐潈', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭浌涓曘€? },
      { id: 'q5', knowledgePointId: 'sanguo', prompt: '铚€鍥界殑寤虹珛鑰呮槸锛?, options: ['鍒樺', '鏇逛笗', '瀛欐潈', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬垬澶囥€? },
      { id: 'q6', knowledgePointId: 'sanguo', prompt: '鍚村浗鐨勫缓绔嬭€呮槸锛?, options: ['瀛欐潈', '鏇逛笗', '鍒樺', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬瓩鏉冦€? },
      { id: 'q7', knowledgePointId: 'chibi', prompt: '璧ゅ涔嬫垬濂犲畾浜嗕粈涔堝眬闈㈢殑鍩虹锛?, options: ['涓夊浗榧庣珛', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫笁鍥介紟绔嬨€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'chibi', prompt: '锛堜腑鑰冪湡棰橈級璧ゅ涔嬫垬鍙戠敓鍦ㄥ摢涓€骞达紵', options: ['208骞?, '220骞?, '221骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?08骞淬€? },
      { id: 'q9', knowledgePointId: 'sanguo', prompt: '锛堜腑鑰冪湡棰橈級榄忓浗鐨勫缓绔嬭€呮槸锛?, options: ['鏇逛笗', '鍒樺', '瀛欐潈', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭浌涓曘€? },
      { id: 'q10', knowledgePointId: 'sanguo', prompt: '锛堜腑鑰冪湡棰橈級铚€鍥界殑寤虹珛鑰呮槸锛?, options: ['鍒樺', '鏇逛笗', '瀛欐潈', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬垬澶囥€? },
    ],
  },
  {
    id: 'his-7a-17', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈?, edition: '缁熺紪鐗?, section: '绗?7璇?瑗挎檵鐨勭煭鏆傜粺涓€鍜屽寳鏂瑰悇鏃忕殑鍐呰縼',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p17' },
    knowledgePoints: [
      { id: 'xijin', title: '瑗挎檵缁熶竴', content: '266骞达紝鍙搁┈鐐庡缓绔嬫檵鏈濓紝瀹氶兘娲涢槼锛屽彶绉拌タ鏅嬨€?80骞达紝瑗挎檵鍐涢槦鐏帀浜嗗惔鍥斤紝缁撴潫浜嗗垎瑁傚眬闈€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'xijin', prompt: '瑗挎檵寤虹珛浜庡摢涓€骞达紵', options: ['266骞?, '280骞?, '208骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細266骞淬€? },
      { id: 'q2', knowledgePointId: 'xijin', prompt: '瑗挎檵鐨勫缓绔嬭€呮槸锛?, options: ['鍙搁┈鐐?, '鍙搁┈鎳?, '鍙搁┈鏄?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍙搁┈鐐庛€? },
      { id: 'q3', knowledgePointId: 'xijin', prompt: '瑗挎檵鐨勯兘鍩庢槸锛?, options: ['娲涢槼', '闀垮畨', '寤轰笟', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細娲涢槼銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'xijin', prompt: '瑗挎檵缁熶竴鍏ㄥ浗鏄湪鍝竴骞达紵', options: ['280骞?, '266骞?, '208骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?80骞淬€? },
      { id: 'q5', knowledgePointId: 'xijin', prompt: '瑗挎檵鐏帀浜嗗摢涓浗瀹讹紝缁撴潫浜嗗垎瑁傚眬闈紵', options: ['鍚村浗', '铚€鍥?, '榄忓浗', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬惔鍥姐€? },
      { id: 'q6', knowledgePointId: 'xijin', prompt: '瑗挎檵鏄摢涓湞浠ｅ缓绔嬬殑锛?, options: ['鏅嬫湞', '榄忔湞', '姹夋湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭檵鏈濄€? },
      { id: 'q7', knowledgePointId: 'xijin', prompt: '瑗挎檵鐨勯兘鍩庢槸锛?, options: ['娲涢槼', '闀垮畨', '寤轰笟', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭礇闃炽€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'xijin', prompt: '锛堜腑鑰冪湡棰橈級瑗挎檵寤虹珛浜庡摢涓€骞达紵', options: ['266骞?, '280骞?, '208骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?66骞淬€? },
      { id: 'q9', knowledgePointId: 'xijin', prompt: '锛堜腑鑰冪湡棰橈級瑗挎檵鐨勫缓绔嬭€呮槸锛?, options: ['鍙搁┈鐐?, '鍙搁┈鎳?, '鍙搁┈鏄?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬徃椹値銆? },
      { id: 'q10', knowledgePointId: 'xijin', prompt: '锛堜腑鑰冪湡棰橈級瑗挎檵缁熶竴鍏ㄥ浗鏄湪鍝竴骞达紵', options: ['280骞?, '266骞?, '208骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?80骞淬€? },
    ],
  },
  {
    id: 'his-7a-18', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈?, edition: '缁熺紪鐗?, section: '绗?8璇?涓滄檵鍗楁湞鏀挎不鍜屾睙鍗楀湴鍖哄紑鍙?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p18' },
    knowledgePoints: [
      { id: 'jiangnan', title: '姹熷崡鍦板尯鐨勫紑鍙?, content: '涓滄眽鏈勾浠ユ潵锛屽寳鏂逛汉鍙ｅぇ閲忓崡杩侊紝缁欐睙鍗楀湴鍖哄甫鍘讳簡鍔冲姩鍔涘拰鍏堣繘鐨勭敓浜ф妧鏈€傛睙鍗楀湴鍖虹殑寮€鍙戝鎴戝浗缁忔祹浜х敓浜嗘繁杩滃奖鍝嶏紝涓虹粡娴庨噸蹇冮€愭笎鍗楃Щ濂犲畾浜嗗熀纭€銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'jiangnan', prompt: '涓滄眽鏈勾浠ユ潵锛屽摢閲岀殑浜哄彛澶ч噺鍗楄縼锛?, options: ['鍖楁柟', '鍗楁柟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍖楁柟銆? },
      { id: 'q2', knowledgePointId: 'jiangnan', prompt: '鍖楁柟浜哄彛澶ч噺鍗楄縼锛岀粰姹熷崡鍦板尯甯﹀幓浜嗕粈涔堬紵', options: ['鍔冲姩鍔涘拰鍏堣繘鐨勭敓浜ф妧鏈?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍔冲姩鍔涘拰鍏堣繘鐨勭敓浜ф妧鏈€? },
      { id: 'q3', knowledgePointId: 'jiangnan', prompt: '姹熷崡鍦板尯鐨勫紑鍙戜负缁忔祹閲嶅績閫愭笎浠€涔堝瀹氫簡鍩虹锛?, options: ['鍗楃Щ', '鍖楃Щ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗楃Щ銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'jiangnan', prompt: '姹熷崡鍦板尯鐨勫紑鍙戝鎴戝浗缁忔祹浜х敓浜嗕粈涔堝奖鍝嶏紵', options: ['娣辫繙褰卞搷', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭繁杩滃奖鍝嶃€? },
      { id: 'q5', knowledgePointId: 'jiangnan', prompt: '姹熷崡鍦板尯鐨勫紑鍙戜负缁忔祹閲嶅績閫愭笎鍗楃Щ濂犲畾浜嗕粈涔堬紵', options: ['鍩虹', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬熀纭€銆? },
      { id: 'q6', knowledgePointId: 'jiangnan', prompt: '涓滄檵鐨勯兘鍩庢槸锛?, options: ['寤哄悍', '娲涢槼', '闀垮畨', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬缓搴枫€? },
      { id: 'q7', knowledgePointId: 'jiangnan', prompt: '涓滄檵鏄摢涓湞浠ｏ紵', options: ['鏅嬫湞', '姹夋湞', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭檵鏈濄€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'jiangnan', prompt: '锛堜腑鑰冪湡棰橈級涓滄眽鏈勾浠ユ潵锛屽摢閲岀殑浜哄彛澶ч噺鍗楄縼锛?, options: ['鍖楁柟', '鍗楁柟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬寳鏂广€? },
      { id: 'q9', knowledgePointId: 'jiangnan', prompt: '锛堜腑鑰冪湡棰橈級姹熷崡鍦板尯鐨勫紑鍙戜负缁忔祹閲嶅績閫愭笎浠€涔堝瀹氫簡鍩虹锛?, options: ['鍗楃Щ', '鍖楃Щ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬崡绉汇€? },
      { id: 'q10', knowledgePointId: 'jiangnan', prompt: '锛堜腑鑰冪湡棰橈級鍖楁柟浜哄彛澶ч噺鍗楄縼锛岀粰姹熷崡鍦板尯甯﹀幓浜嗕粈涔堬紵', options: ['鍔冲姩鍔涘拰鍏堣繘鐨勭敓浜ф妧鏈?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬姵鍔ㄥ姏鍜屽厛杩涚殑鐢熶骇鎶€鏈€? },
    ],
  },
  {
    id: 'his-7a-19', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈?, edition: '缁熺紪鐗?, section: '绗?9璇?鍖楁湞鏀挎不鍜屽寳鏂规皯鏃忓ぇ浜よ瀺',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p19' },
    knowledgePoints: [
      { id: 'xiaowen', title: '鍖楅瓘瀛濇枃甯濇敼闈?, content: '鍖楅瓘瀛濇枃甯濇敼闈╃殑鎺柦锛氳縼閮芥礇闃筹紱璇存眽璇紱绌挎眽鏈嶏紱鏀规眽濮擄紱涓庢眽鏃忛€氬銆傚寳榄忓瓭鏂囧笣鏀归潻淇冭繘浜嗘皯鏃忚瀺鍚堛€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'xiaowen', prompt: '鍖楅瓘瀛濇枃甯濇妸閮藉煄杩佸埌浜嗗摢閲岋紵', options: ['娲涢槼', '闀垮畨', '寤哄悍', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細娲涢槼銆? },
      { id: 'q2', knowledgePointId: 'xiaowen', prompt: '鍖楅瓘瀛濇枃甯濇敼闈╀績杩涗簡浠€涔堬紵', options: ['姘戞棌铻嶅悎', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細姘戞棌铻嶅悎銆? },
      { id: 'q3', knowledgePointId: 'xiaowen', prompt: '鍖楅瓘瀛濇枃甯濇槸鍝釜鏈濅唬鐨勭殗甯濓紵', options: ['鍖楅瓘', '涓滄檵', '瑗挎檵', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍖楅瓘銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'xiaowen', prompt: '涓嬪垪灞炰簬鍖楅瓘瀛濇枃甯濇敼闈╂帾鏂界殑鏄紵', options: ['璇存眽璇?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳姹夎銆? },
      { id: 'q5', knowledgePointId: 'xiaowen', prompt: '涓嬪垪灞炰簬鍖楅瓘瀛濇枃甯濇敼闈╂帾鏂界殑鏄紵', options: ['绌挎眽鏈?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱┛姹夋湇銆? },
      { id: 'q6', knowledgePointId: 'xiaowen', prompt: '涓嬪垪灞炰簬鍖楅瓘瀛濇枃甯濇敼闈╂帾鏂界殑鏄紵', options: ['鏀规眽濮?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭敼姹夊銆? },
      { id: 'q7', knowledgePointId: 'xiaowen', prompt: '涓嬪垪灞炰簬鍖楅瓘瀛濇枃甯濇敼闈╂帾鏂界殑鏄紵', options: ['涓庢眽鏃忛€氬', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫笌姹夋棌閫氬銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'xiaowen', prompt: '锛堜腑鑰冪湡棰橈級鍖楅瓘瀛濇枃甯濇妸閮藉煄杩佸埌浜嗗摢閲岋紵', options: ['娲涢槼', '闀垮畨', '寤哄悍', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭礇闃炽€? },
      { id: 'q9', knowledgePointId: 'xiaowen', prompt: '锛堜腑鑰冪湡棰橈級鍖楅瓘瀛濇枃甯濇敼闈╀績杩涗簡浠€涔堬紵', options: ['姘戞棌铻嶅悎', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭皯鏃忚瀺鍚堛€? },
      { id: 'q10', knowledgePointId: 'xiaowen', prompt: '锛堜腑鑰冪湡棰橈級涓嬪垪灞炰簬鍖楅瓘瀛濇枃甯濇敼闈╂帾鏂界殑鏄紵', options: ['璇存眽璇?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳姹夎銆? },
    ],
  },
  {
    id: 'his-7a-20', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈?, edition: '缁熺紪鐗?, section: '绗?0璇?涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈熺殑绉戞妧涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p20' },
    knowledgePoints: [
      { id: 'zu', title: '绁栧啿涔?, content: '鍗楁湞鏃舵湡锛岀鍐蹭箣鎶婂渾鍛ㄧ巼绮剧‘璁＄畻鍒板皬鏁扮偣浠ュ悗鐨勭涓冧綅鏁板瓧锛岃繖椤规垚鏋滈鍏堜笘鐣岃繎涓€鍗冨勾銆? },
      { id: 'wang', title: '鐜嬬静涔?, content: '涓滄檵涔︽硶瀹剁帇缇蹭箣锛岃鍚庝汉绉颁负"涔﹀湥"銆備粬鐨勪唬琛ㄤ綔鏄€婂叞浜簭銆嬶紝鏈?澶╀笅绗竴琛屼功"鐨勭編瑾夈€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'zu', prompt: '鎶婂渾鍛ㄧ巼绮剧‘璁＄畻鍒板皬鏁扮偣浠ュ悗鐨勭涓冧綅鏁板瓧鐨勬槸锛?, options: ['绁栧啿涔?, '鐜嬬静涔?, '椤炬伜涔?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細绁栧啿涔嬨€? },
      { id: 'q2', knowledgePointId: 'wang', prompt: '琚悗浜虹О涓?涔﹀湥"鐨勬槸锛?, options: ['鐜嬬静涔?, '绁栧啿涔?, '椤炬伜涔?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鐜嬬静涔嬨€? },
      { id: 'q3', knowledgePointId: 'wang', prompt: '鐜嬬静涔嬬殑浠ｈ〃浣滄槸锛?, options: ['銆婂叞浜簭銆?, '銆婂彶璁般€?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細銆婂叞浜簭銆嬨€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'zu', prompt: '绁栧啿涔嬫槸鍝釜鏈濅唬鐨勪汉锛?, options: ['鍗楁湞', '涓滄檵', '瑗挎檵', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬崡鏈濄€? },
      { id: 'q5', knowledgePointId: 'zu', prompt: '绁栧啿涔嬬殑杩欓」鎴愭灉棰嗗厛涓栫晫杩戝灏戝勾锛?, options: ['涓€鍗冨勾', '浜旂櫨骞?, '涓ゅ崈骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫竴鍗冨勾銆? },
      { id: 'q6', knowledgePointId: 'wang', prompt: '鐜嬬静涔嬫槸鍝釜鏈濅唬鐨勪汉锛?, options: ['涓滄檵', '鍗楁湞', '瑗挎檵', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫笢鏅嬨€? },
      { id: 'q7', knowledgePointId: 'wang', prompt: '銆婂叞浜簭銆嬫湁浠€涔堢編瑾夛紵', options: ['"澶╀笅绗竴琛屼功"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?澶╀笅绗竴琛屼功"銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'zu', prompt: '锛堜腑鑰冪湡棰橈級鎶婂渾鍛ㄧ巼绮剧‘璁＄畻鍒板皬鏁扮偣浠ュ悗鐨勭涓冧綅鏁板瓧鐨勬槸锛?, options: ['绁栧啿涔?, '鐜嬬静涔?, '椤炬伜涔?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱鍐蹭箣銆? },
      { id: 'q9', knowledgePointId: 'wang', prompt: '锛堜腑鑰冪湡棰橈級琚悗浜虹О涓?涔﹀湥"鐨勬槸锛?, options: ['鐜嬬静涔?, '绁栧啿涔?, '椤炬伜涔?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱帇缇蹭箣銆? },
      { id: 'q10', knowledgePointId: 'zu', prompt: '锛堜腑鑰冪湡棰橈級绁栧啿涔嬫槸鍝釜鏈濅唬鐨勪汉锛?, options: ['鍗楁湞', '涓滄檵', '瑗挎檵', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬崡鏈濄€? },
    ],
  },
  {
    id: 'his-7a-1', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡锛氫腑鍥藉鍐呮棭鏈熶汉绫讳笌鏂囨槑鐨勮捣婧?, edition: '缁熺紪鐗?, section: '绗?璇?涓浗澧冨唴鏃╂湡浜虹被鐨勪唬琛ㄢ€斺€斿寳浜汉',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p1' },
    knowledgePoints: [
      { id: 'beijing', title: '鍖椾含浜?, content: '鍖椾含浜洪仐鍧€浣嶄簬鍖椾含瑗垮崡鍛ㄥ彛搴楅緳楠ㄥ北涓娿€傚寳浜汉鐢熸椿鍦ㄨ窛浠婄害70涓団€?0涓囧勾銆傚寳浜汉鑳藉鐩寸珛琛岃蛋锛屼細浣跨敤鐏紝杩樹細闀挎椂闂翠繚瀛樼伀绉嶃€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'beijing', prompt: '鍖椾含浜洪仐鍧€浣嶄簬鍝噷锛?, options: ['鍖椾含瑗垮崡鍛ㄥ彛搴楅緳楠ㄥ北', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍖椾含瑗垮崡鍛ㄥ彛搴楅緳楠ㄥ北銆? },
      { id: 'q2', knowledgePointId: 'beijing', prompt: '鍖椾含浜虹敓娲诲湪璺濅粖绾﹀灏戝勾锛?, options: ['70涓団€?0涓囧勾', '170涓囧勾', '3涓囧勾', '1涓囧勾'], answerIndex: 0, explanation: '绠€鍗曪細70涓団€?0涓囧勾銆? },
      { id: 'q3', knowledgePointId: 'beijing', prompt: '鍖椾含浜鸿兘澶燂紵', options: ['鐩寸珛琛岃蛋', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鐩寸珛琛岃蛋銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'beijing', prompt: '鍖椾含浜轰細浣跨敤锛?, options: ['鐏?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱伀銆? },
      { id: 'q5', knowledgePointId: 'beijing', prompt: '鍖椾含浜鸿繕浼氶暱鏃堕棿淇濆瓨锛?, options: ['鐏', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱伀绉嶃€? },
      { id: 'q6', knowledgePointId: 'beijing', prompt: '鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫绘槸锛?, options: ['鍏冭皨浜?, '鍖椾含浜?, '灞遍《娲炰汉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬厓璋嬩汉銆? },
      { id: 'q7', knowledgePointId: 'beijing', prompt: '鍏冭皨浜虹敓娲诲湪璺濅粖绾﹀灏戝勾锛?, options: ['170涓囧勾', '70涓団€?0涓囧勾', '3涓囧勾', '1涓囧勾'], answerIndex: 0, explanation: '涓瓑锛?70涓囧勾銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'beijing', prompt: '锛堜腑鑰冪湡棰橈級鍖椾含浜洪仐鍧€浣嶄簬鍝噷锛?, options: ['鍖椾含瑗垮崡鍛ㄥ彛搴楅緳楠ㄥ北', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬寳浜タ鍗楀懆鍙ｅ簵榫欓灞便€? },
      { id: 'q9', knowledgePointId: 'beijing', prompt: '锛堜腑鑰冪湡棰橈級鍖椾含浜虹敓娲诲湪璺濅粖绾﹀灏戝勾锛?, options: ['70涓団€?0涓囧勾', '170涓囧勾', '3涓囧勾', '1涓囧勾'], answerIndex: 0, explanation: '鐪熼锛?0涓団€?0涓囧勾銆? },
      { id: 'q10', knowledgePointId: 'beijing', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╃殑鍙や汉绫绘槸锛?, options: ['鍏冭皨浜?, '鍖椾含浜?, '灞遍《娲炰汉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬厓璋嬩汉銆? },
    ],
  },
  {
    id: 'his-7a-2', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡锛氫腑鍥藉鍐呮棭鏈熶汉绫讳笌鏂囨槑鐨勮捣婧?, edition: '缁熺紪鐗?, section: '绗?璇?鍘熷鍐滆€曠敓娲?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p2' },
    knowledgePoints: [
      { id: 'agriculture', title: '鍘熷鍐滆€曠敓娲?, content: '鍗婂潯灞呮皯鐢熸椿鍦ㄨ窛浠婄害6000骞达紝浣忓崐鍦扮┐寮忓渾褰㈡埧灞嬶紝绉嶆绮熴€傛渤濮嗘浮灞呮皯鐢熸椿鍦ㄨ窛浠婄害7000骞达紝浣忓共鏍忓紡寤虹瓚锛岀妞嶆按绋汇€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'agriculture', prompt: '鍗婂潯灞呮皯鐢熸椿鍦ㄨ窛浠婄害澶氬皯骞达紵', options: ['6000骞?, '7000骞?, '1涓囧勾', '5000骞?], answerIndex: 0, explanation: '绠€鍗曪細6000骞淬€? },
      { id: 'q2', knowledgePointId: 'agriculture', prompt: '鍗婂潯灞呮皯浣忎粈涔堟埧瀛愶紵', options: ['鍗婂湴绌村紡鍦嗗舰鎴垮眿', '骞叉爮寮忓缓绛?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗婂湴绌村紡鍦嗗舰鎴垮眿銆? },
      { id: 'q3', knowledgePointId: 'agriculture', prompt: '鍗婂潯灞呮皯绉嶆浠€涔堬紵', options: ['绮?, '姘寸ɑ', '灏忛害', '鐜夌背'], answerIndex: 0, explanation: '绠€鍗曪細绮熴€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'agriculture', prompt: '娌冲娓″眳姘戠敓娲诲湪璺濅粖绾﹀灏戝勾锛?, options: ['7000骞?, '6000骞?, '1涓囧勾', '5000骞?], answerIndex: 0, explanation: '涓瓑锛?000骞淬€? },
      { id: 'q5', knowledgePointId: 'agriculture', prompt: '娌冲娓″眳姘戜綇浠€涔堟埧瀛愶紵', options: ['骞叉爮寮忓缓绛?, '鍗婂湴绌村紡鍦嗗舰鎴垮眿', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬共鏍忓紡寤虹瓚銆? },
      { id: 'q6', knowledgePointId: 'agriculture', prompt: '娌冲娓″眳姘戠妞嶄粈涔堬紵', options: ['姘寸ɑ', '绮?, '灏忛害', '鐜夌背'], answerIndex: 0, explanation: '涓瓑锛氭按绋汇€? },
      { id: 'q7', knowledgePointId: 'agriculture', prompt: '鍗婂潯灞呮皯鍜屾渤濮嗘浮灞呮皯閮界敓娲诲湪鍝釜澶ф渤娴佸煙锛?, options: ['榛勬渤娴佸煙鍜岄暱姹熸祦鍩?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶粍娌虫祦鍩熷拰闀挎睙娴佸煙銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'agriculture', prompt: '锛堜腑鑰冪湡棰橈級鍗婂潯灞呮皯鐢熸椿鍦ㄨ窛浠婄害澶氬皯骞达紵', options: ['6000骞?, '7000骞?, '1涓囧勾', '5000骞?], answerIndex: 0, explanation: '鐪熼锛?000骞淬€? },
      { id: 'q9', knowledgePointId: 'agriculture', prompt: '锛堜腑鑰冪湡棰橈級鍗婂潯灞呮皯绉嶆浠€涔堬紵', options: ['绮?, '姘寸ɑ', '灏忛害', '鐜夌背'], answerIndex: 0, explanation: '鐪熼锛氱矡銆? },
      { id: 'q10', knowledgePointId: 'agriculture', prompt: '锛堜腑鑰冪湡棰橈級娌冲娓″眳姘戠妞嶄粈涔堬紵', options: ['姘寸ɑ', '绮?, '灏忛害', '鐜夌背'], answerIndex: 0, explanation: '鐪熼锛氭按绋汇€? },
    ],
  },
  {
    id: 'his-7a-3', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡锛氫腑鍥藉鍐呮棭鏈熶汉绫讳笌鏂囨槑鐨勮捣婧?, edition: '缁熺紪鐗?, section: '绗?璇?杩滃彜鐨勪紶璇?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p3' },
    knowledgePoints: [
      { id: 'legend', title: '杩滃彜鐨勪紶璇?, content: '鐐庨粍閮ㄨ惤鑱旂洘浠ュ悗閫愭笎褰㈡垚鍗庡鏃忥紝鍚庝汉灏婂磭鐐庡笣鍜岄粍甯濅负涓崕姘戞棌鐨勪汉鏂囧垵绁栥€傛捣鍐呭鐨勫崕浜轰篃浠?鐐庨粍瀛愬瓩"鑷О銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'legend', prompt: '鐐庨粍閮ㄨ惤鑱旂洘浠ュ悗閫愭笎褰㈡垚浠€涔堟棌锛?, options: ['鍗庡鏃?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗庡鏃忋€? },
      { id: 'q2', knowledgePointId: 'legend', prompt: '鍚庝汉灏婂磭鐐庡笣鍜岄粍甯濅负涓崕姘戞棌鐨勪粈涔堬紵', options: ['浜烘枃鍒濈', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細浜烘枃鍒濈銆? },
      { id: 'q3', knowledgePointId: 'legend', prompt: '娴峰唴澶栫殑鍗庝汉涔熶互浠€涔堣嚜绉帮紵', options: ['鐐庨粍瀛愬瓩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鐐庨粍瀛愬瓩銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'legend', prompt: '鐐庡笣鍜岄粍甯濋儴钀借仈鐩熷湪鍝釜鎴樺焦涓墦璐ヤ簡铓╁挨閮ㄨ惤锛?, options: ['娑块箍涔嬫垬', '闃硥涔嬫垬', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭犊楣夸箣鎴樸€? },
      { id: 'q5', knowledgePointId: 'legend', prompt: '鐐庡笣鍜岄粍甯濅箣闂寸殑鎴樺焦鏄紵', options: ['闃硥涔嬫垬', '娑块箍涔嬫垬', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶槳娉変箣鎴樸€? },
      { id: 'q6', knowledgePointId: 'legend', prompt: '鐩镐紶鏄皝寤洪€犲瀹わ紝鍒朵綔琛ｈ３锛屾寲鎺樻按浜曪紝鍒堕€犺埞鍙紵', options: ['榛勫笣', '鐐庡笣', '铓╁挨', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶粍甯濄€? },
      { id: 'q7', knowledgePointId: 'legend', prompt: '鐩镐紶鐐庡笣鏁欐皯寮€鍨﹁€曠锛屽埗浣滅敓浜у伐鍏凤紝绉嶆浠€涔堬紵', options: ['浜旇胺钄彍', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫簲璋疯敩鑿溿€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'legend', prompt: '锛堜腑鑰冪湡棰橈級鐐庨粍閮ㄨ惤鑱旂洘浠ュ悗閫愭笎褰㈡垚浠€涔堟棌锛?, options: ['鍗庡鏃?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬崕澶忔棌銆? },
      { id: 'q9', knowledgePointId: 'legend', prompt: '锛堜腑鑰冪湡棰橈級鍚庝汉灏婂磭鐐庡笣鍜岄粍甯濅负涓崕姘戞棌鐨勪粈涔堬紵', options: ['浜烘枃鍒濈', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氫汉鏂囧垵绁栥€? },
      { id: 'q10', knowledgePointId: 'legend', prompt: '锛堜腑鑰冪湡棰橈級娴峰唴澶栫殑鍗庝汉涔熶互浠€涔堣嚜绉帮紵', options: ['鐐庨粍瀛愬瓩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱値榛勫瓙瀛欍€? },
    ],
  },
  {
    id: 'his-7a-4', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈燂細鏃╂湡鍥藉涓庣ぞ浼氬彉闈?, edition: '缁熺紪鐗?, section: '绗?璇?澶忓晢瑗垮懆鐨勬洿鏇?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p4' },
    knowledgePoints: [
      { id: 'xisha', title: '澶忓晢瑗垮懆鐨勬洿鏇?, content: '绾﹀叕鍏冨墠2070骞达紝绂瑰缓绔嬪鐜嬫湞銆傝繖鏄腑鍥藉巻鍙蹭笂绗竴涓帇鏈濄€傚悗鏉ワ紝姹ゅ缓绔嬪晢鏈濄€傚叕鍏冨墠1046骞达紝鍛ㄦ鐜嬪缓绔嬪懆鏈濓紝瀹氶兘闀愪含锛屽彶绉拌タ鍛ㄣ€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'xisha', prompt: '绾﹀叕鍏冨墠2070骞达紝璋佸缓绔嬪鐜嬫湞锛?, options: ['绂?, '姹?, '鍛ㄦ鐜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細绂广€? },
      { id: 'q2', knowledgePointId: 'xisha', prompt: '杩欐槸涓浗鍘嗗彶涓婄鍑犱釜鐜嬫湞锛?, options: ['绗竴涓?, '绗簩涓?, '绗笁涓?, '绗洓涓?], answerIndex: 0, explanation: '绠€鍗曪細绗竴涓€? },
      { id: 'q3', knowledgePointId: 'xisha', prompt: '鍚庢潵锛岃皝寤虹珛鍟嗘湞锛?, options: ['姹?, '绂?, '鍛ㄦ鐜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細姹ゃ€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'xisha', prompt: '鍏厓鍓?046骞达紝璋佸缓绔嬪懆鏈濓紵', options: ['鍛ㄦ鐜?, '绂?, '姹?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬懆姝︾帇銆? },
      { id: 'q5', knowledgePointId: 'xisha', prompt: '鍛ㄦ湞瀹氶兘鍝噷锛?, options: ['闀愪含', '闃冲煄', '浜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶晲浜€? },
      { id: 'q6', knowledgePointId: 'xisha', prompt: '鍙茬О浠€涔堬紵', options: ['瑗垮懆', '涓滃懆', '鍟嗘湞', '澶忔湞'], answerIndex: 0, explanation: '涓瓑锛氳タ鍛ㄣ€? },
      { id: 'q7', knowledgePointId: 'xisha', prompt: '涓轰簡绋冲畾鍛ㄥ垵鐨勬斂娌诲舰鍔匡紝宸╁浐鐤嗗湡锛屽懆鐜嬪疄琛屼粈涔堝埗搴︼紵', options: ['鍒嗗皝鍒?, '涓栬鍒?, '绂呰鍒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬垎灏佸埗銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'xisha', prompt: '锛堜腑鑰冪湡棰橈級绾﹀叕鍏冨墠2070骞达紝璋佸缓绔嬪鐜嬫湞锛?, options: ['绂?, '姹?, '鍛ㄦ鐜?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱銆? },
      { id: 'q9', knowledgePointId: 'xisha', prompt: '锛堜腑鑰冪湡棰橈級杩欐槸涓浗鍘嗗彶涓婄鍑犱釜鐜嬫湞锛?, options: ['绗竴涓?, '绗簩涓?, '绗笁涓?, '绗洓涓?], answerIndex: 0, explanation: '鐪熼锛氱涓€涓€? },
      { id: 'q10', knowledgePointId: 'xisha', prompt: '锛堜腑鑰冪湡棰橈級涓轰簡绋冲畾鍛ㄥ垵鐨勬斂娌诲舰鍔匡紝宸╁浐鐤嗗湡锛屽懆鐜嬪疄琛屼粈涔堝埗搴︼紵', options: ['鍒嗗皝鍒?, '涓栬鍒?, '绂呰鍒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬垎灏佸埗銆? },
    ],
  },
  {
    id: 'his-7a-5', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈燂細鏃╂湡鍥藉涓庣ぞ浼氬彉闈?, edition: '缁熺紪鐗?, section: '绗?璇?闈掗摐鍣ㄤ笌鐢查鏂?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p5' },
    knowledgePoints: [
      { id: 'bronze', title: '闈掗摐鍣ㄤ笌鐢查鏂?, content: '鍙告瘝鎴婇紟鏄縿浠婁笘鐣屼笂鍑哄湡鐨勬渶閲嶇殑闈掗摐鍣ㄣ€傜敳楠ㄦ枃鏄腑鍥藉凡鍙戠幇鐨勫彜浠ｆ枃瀛椾腑骞翠唬鏈€鏃┿€佷綋绯昏緝涓哄畬鏁寸殑鏂囧瓧銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'bronze', prompt: '浠€涔堟槸杩勪粖涓栫晫涓婂嚭鍦熺殑鏈€閲嶇殑闈掗摐鍣紵', options: ['鍙告瘝鎴婇紟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍙告瘝鎴婇紟銆? },
      { id: 'q2', knowledgePointId: 'bronze', prompt: '浠€涔堟槸涓浗宸插彂鐜扮殑鍙や唬鏂囧瓧涓勾浠ｆ渶鏃┿€佷綋绯昏緝涓哄畬鏁寸殑鏂囧瓧锛?, options: ['鐢查鏂?, '閲戞枃', '灏忕瘑', '闅朵功'], answerIndex: 0, explanation: '绠€鍗曪細鐢查鏂囥€? },
      { id: 'q3', knowledgePointId: 'bronze', prompt: '鐢查鏂囨槸鍦ㄤ粈涔堟椂鏈熷埢鍐欏湪榫熺敳鍜岀墰銆佺緤绛夊吔楠ㄤ笂鐨勬枃瀛楋紵', options: ['鍟嗗懆', '澶忓晢', '瑗垮懆', '涓滃懆'], answerIndex: 0, explanation: '绠€鍗曪細鍟嗗懆銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'bronze', prompt: '鐢查鏂囦娇鐢ㄥ绉嶉€犲瓧鏂规硶锛屾渶鍘熷鐨勯€犲瓧鏂规硶鏄紵', options: ['璞″舰', '鎸囦簨', '浼氭剰', '褰㈠０'], answerIndex: 0, explanation: '涓瓑锛氳薄褰€? },
      { id: 'q5', knowledgePointId: 'bronze', prompt: '鐢查鏂囧凡缁忓叿澶囦簡姹夊瓧鐨勫熀鏈粨鏋勶紝寰堝瀛椾綋鑷充粖浠嶅湪浣跨敤锛屾槸姹夊瓧褰㈡垚涓庡彂灞曠殑锛?, options: ['閲嶈闃舵', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶噸瑕侀樁娈点€? },
      { id: 'q6', knowledgePointId: 'bronze', prompt: '鍙告瘝鎴婇紟鏄摢涓湞浠ｇ殑闈掗摐鍣紵', options: ['鍟嗘湞', '澶忔湞', '瑗垮懆', '涓滃懆'], answerIndex: 0, explanation: '涓瓑锛氬晢鏈濄€? },
      { id: 'q7', knowledgePointId: 'bronze', prompt: '鐢查鏂囩殑鍙戠幇鑰呮槸锛?, options: ['鐜嬫嚳鑽?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱帇鎳胯崳銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'bronze', prompt: '锛堜腑鑰冪湡棰橈級浠€涔堟槸杩勪粖涓栫晫涓婂嚭鍦熺殑鏈€閲嶇殑闈掗摐鍣紵', options: ['鍙告瘝鎴婇紟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬徃姣嶆垔榧庛€? },
      { id: 'q9', knowledgePointId: 'bronze', prompt: '锛堜腑鑰冪湡棰橈級浠€涔堟槸涓浗宸插彂鐜扮殑鍙や唬鏂囧瓧涓勾浠ｆ渶鏃┿€佷綋绯昏緝涓哄畬鏁寸殑鏂囧瓧锛?, options: ['鐢查鏂?, '閲戞枃', '灏忕瘑', '闅朵功'], answerIndex: 0, explanation: '鐪熼锛氱敳楠ㄦ枃銆? },
      { id: 'q10', knowledgePointId: 'bronze', prompt: '锛堜腑鑰冪湡棰橈級鐢查鏂囨槸鍦ㄤ粈涔堟椂鏈熷埢鍐欏湪榫熺敳鍜岀墰銆佺緤绛夊吔楠ㄤ笂鐨勬枃瀛楋紵', options: ['鍟嗗懆', '澶忓晢', '瑗垮懆', '涓滃懆'], answerIndex: 0, explanation: '鐪熼锛氬晢鍛ㄣ€? },
    ],
  },
  {
    id: 'his-7a-6', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈燂細鏃╂湡鍥藉涓庣ぞ浼氬彉闈?, edition: '缁熺紪鐗?, section: '绗?璇?鍔ㄨ崱鐨勬槬绉嬫椂鏈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p6' },
    knowledgePoints: [
      { id: 'spring', title: '鍔ㄨ崱鐨勬槬绉嬫椂鏈?, content: '鏄ョ鏃舵湡锛岀ぞ浼氱粡娴庢湁寰堝ぇ鐨勫彂灞曘€傞搧鍒跺啘鍏峰拰鐗涜€曞嚭鐜帮紝淇冭繘浜嗗啘涓氫笂鐨勬繁鑰曠粏浣溿€傛槬绉嬫椂鏈熸湁浼楀鐨勮渚浗锛屽叾涓瘮杈冨己澶х殑鏈夊崄鍑犱釜銆傜敱浜庢斂娌汇€佺粡娴庡彂灞曚笉骞宠　锛屽悇璇镐警鍥戒负浜嗚嚜韬殑鍒╃泭锛岀浉浜掍箣闂村睍寮€婵€鐑堢殑浜夋枟銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'spring', prompt: '鏄ョ鏃舵湡锛屼粈涔堝嚭鐜帮紝淇冭繘浜嗗啘涓氫笂鐨勬繁鑰曠粏浣滐紵', options: ['閾佸埗鍐滃叿鍜岀墰鑰?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細閾佸埗鍐滃叿鍜岀墰鑰曘€? },
      { id: 'q2', knowledgePointId: 'spring', prompt: '鏄ョ鏃舵湡鏈変紬澶氱殑锛?, options: ['璇镐警鍥?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細璇镐警鍥姐€? },
      { id: 'q3', knowledgePointId: 'spring', prompt: '鍚勮渚浗涓轰簡鑷韩鐨勫埄鐩婏紝鐩镐簰涔嬮棿灞曞紑婵€鐑堢殑锛?, options: ['浜夋枟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細浜夋枟銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'spring', prompt: '鏄ョ鏃舵湡鐨勭涓€涓湼涓绘槸锛?, options: ['榻愭鍏?, '鏅嬫枃鍏?, '妤氬簞鐜?, '绉︾﹩鍏?], answerIndex: 0, explanation: '涓瓑锛氶綈妗撳叕銆? },
      { id: 'q5', knowledgePointId: 'spring', prompt: '榻愭鍏换鐢ㄨ皝涓虹浉锛屾敼闈╁唴鏀匡紝鍙戝睍鐢熶骇锛岃缁冨啗闃燂紵', options: ['绠′徊', '鍟嗛瀰', '鏉庢柉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱浠层€? },
      { id: 'q6', knowledgePointId: 'spring', prompt: '榻愭鍏墦鐫€浠€涔堟棗鍙凤紝鍙蜂护璇镐警锛?, options: ['灏婄帇鏀樺し', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬皧鐜嬫敇澶枫€? },
      { id: 'q7', knowledgePointId: 'spring', prompt: '鏄ョ鏃舵湡锛屼竴浜涘己澶х殑璇镐警涓哄彇寰椾紭鍔匡紝浠ヤ粈涔堢殑鍚嶄箟杩涜寰佹垬锛屼簤澶洪湼涓荤殑鍦颁綅锛?, options: ['"灏婄帇鏀樺し"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?灏婄帇鏀樺し"銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'spring', prompt: '锛堜腑鑰冪湡棰橈級鏄ョ鏃舵湡锛屼粈涔堝嚭鐜帮紝淇冭繘浜嗗啘涓氫笂鐨勬繁鑰曠粏浣滐紵', options: ['閾佸埗鍐滃叿鍜岀墰鑰?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶搧鍒跺啘鍏峰拰鐗涜€曘€? },
      { id: 'q9', knowledgePointId: 'spring', prompt: '锛堜腑鑰冪湡棰橈級鏄ョ鏃舵湡鐨勭涓€涓湼涓绘槸锛?, options: ['榻愭鍏?, '鏅嬫枃鍏?, '妤氬簞鐜?, '绉︾﹩鍏?], answerIndex: 0, explanation: '鐪熼锛氶綈妗撳叕銆? },
      { id: 'q10', knowledgePointId: 'spring', prompt: '锛堜腑鑰冪湡棰橈級榻愭鍏换鐢ㄨ皝涓虹浉锛屾敼闈╁唴鏀匡紝鍙戝睍鐢熶骇锛岃缁冨啗闃燂紵', options: ['绠′徊', '鍟嗛瀰', '鏉庢柉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱浠层€? },
    ],
  },
  {
    id: 'his-7a-7', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈燂細鏃╂湡鍥藉涓庣ぞ浼氬彉闈?, edition: '缁熺紪鐗?, section: '绗?璇?鎴樺浗鏃舵湡鐨勭ぞ浼氬彉鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p7' },
    knowledgePoints: [
      { id: 'warring', title: '鎴樺浗鏃舵湡鐨勭ぞ浼氬彉鍖?, content: '鎴樺浗鏃舵湡锛岄搧鍒跺啘鍏峰拰鐗涜€曡繘涓€姝ユ帹骞匡紝绀句細鐢熶骇鍔涙按骞充笉鏂彁楂樸€傚叕鍏冨墠356骞达紝鍟嗛瀰鍦ㄧЕ瀛濆叕鐨勬敮鎸佷笅寮€濮嬪彉娉曘€傚晢闉呭彉娉曚娇绉﹀浗鐨勫浗鍔涘ぇ涓哄寮猴紝鎻愰珮浜嗗啗闃熺殑鎴樻枟鍔涳紝涓€璺冩垚涓烘渶寮虹洓鐨勮渚浗锛屼负浠ュ悗绉︾粺涓€鍏ㄥ浗濂犲畾浜嗗熀纭€銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'warring', prompt: '鎴樺浗鏃舵湡锛屼粈涔堣繘涓€姝ユ帹骞匡紝绀句細鐢熶骇鍔涙按骞充笉鏂彁楂橈紵', options: ['閾佸埗鍐滃叿鍜岀墰鑰?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細閾佸埗鍐滃叿鍜岀墰鑰曘€? },
      { id: 'q2', knowledgePointId: 'warring', prompt: '鍏厓鍓?56骞达紝璋佸湪绉﹀瓭鍏殑鏀寔涓嬪紑濮嬪彉娉曪紵', options: ['鍟嗛瀰', '绠′徊', '鏉庢柉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍟嗛瀰銆? },
      { id: 'q3', knowledgePointId: 'warring', prompt: '鍟嗛瀰鍙樻硶浣垮摢涓浗瀹剁殑鍥藉姏澶т负澧炲己锛?, options: ['绉﹀浗', '榻愬浗', '妤氬浗', '璧靛浗'], answerIndex: 0, explanation: '绠€鍗曪細绉﹀浗銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'warring', prompt: '鍟嗛瀰鍙樻硶鎻愰珮浜嗗啗闃熺殑鎴樻枟鍔涳紝涓€璺冩垚涓烘渶寮虹洓鐨勶紵', options: ['璇镐警鍥?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳渚浗銆? },
      { id: 'q5', knowledgePointId: 'warring', prompt: '涓轰互鍚庡摢涓浗瀹剁粺涓€鍏ㄥ浗濂犲畾浜嗗熀纭€锛?, options: ['绉?, '榻?, '妤?, '璧?], answerIndex: 0, explanation: '涓瓑锛氱Е銆? },
      { id: 'q6', knowledgePointId: 'warring', prompt: '鎴樺浗鍚庢湡锛岀Е鍥藉湪宀锋睙涓父淇瓚浜嗛椈鍚嶄笘鐣岀殑闃叉椽鐏屾簤宸ョ▼锛?, options: ['閮芥睙鍫?, '鐏垫笭', '澶ц繍娌?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶兘姹熷牥銆? },
      { id: 'q7', knowledgePointId: 'warring', prompt: '閮芥睙鍫版槸鐢辫皝涓绘寔淇缓鐨勶紵', options: ['鏉庡啺', '鍟嗛瀰', '绠′徊', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭潕鍐般€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'warring', prompt: '锛堜腑鑰冪湡棰橈級鍏厓鍓?56骞达紝璋佸湪绉﹀瓭鍏殑鏀寔涓嬪紑濮嬪彉娉曪紵', options: ['鍟嗛瀰', '绠′徊', '鏉庢柉', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬晢闉呫€? },
      { id: 'q9', knowledgePointId: 'warring', prompt: '锛堜腑鑰冪湡棰橈級鍟嗛瀰鍙樻硶浣垮摢涓浗瀹剁殑鍥藉姏澶т负澧炲己锛?, options: ['绉﹀浗', '榻愬浗', '妤氬浗', '璧靛浗'], answerIndex: 0, explanation: '鐪熼锛氱Е鍥姐€? },
      { id: 'q10', knowledgePointId: 'warring', prompt: '锛堜腑鑰冪湡棰橈級鎴樺浗鍚庢湡锛岀Е鍥藉湪宀锋睙涓父淇瓚浜嗛椈鍚嶄笘鐣岀殑闃叉椽鐏屾簤宸ョ▼锛?, options: ['閮芥睙鍫?, '鐏垫笭', '澶ц繍娌?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶兘姹熷牥銆? },
    ],
  },
  {
    id: 'his-7a-8', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 澶忓晢鍛ㄦ椂鏈燂細鏃╂湡鍥藉涓庣ぞ浼氬彉闈?, edition: '缁熺紪鐗?, section: '绗?璇?鐧惧浜夐福',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p8' },
    knowledgePoints: [
      { id: 'hundred', title: '鐧惧浜夐福', content: '鑰佸瓙鏄亾瀹跺娲剧殑鍒涘浜猴紝浠栫殑瀛﹁闆嗕腑鍦ㄣ€婇亾寰风粡銆嬩竴涔︿腑銆傚瓟瀛愭槸鍎掑瀛︽淳鐨勫垱濮嬩汉锛屼粬鐨勬€濇兂鍚庢潵鐢卞叾寮熷瓙鏁寸悊鎴愩€婅璇€嬩竴涔︺€傚ⅷ瀛愭槸澧ㄥ瀛︽淳鐨勫垱濮嬩汉锛屼粬涓诲紶"鍏肩埍""闈炴敾"銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'hundred', prompt: '鑰佸瓙鏄摢涓娲剧殑鍒涘浜猴紵', options: ['閬撳', '鍎掑', '澧ㄥ', '娉曞'], answerIndex: 0, explanation: '绠€鍗曪細閬撳銆? },
      { id: 'q2', knowledgePointId: 'hundred', prompt: '鑰佸瓙鐨勫璇撮泦涓湪鍝湰涔︿腑锛?, options: ['銆婇亾寰风粡銆?, '銆婅璇€?, '銆婂瓱瀛愩€?, '銆婇煩闈炲瓙銆?], answerIndex: 0, explanation: '绠€鍗曪細銆婇亾寰风粡銆嬨€? },
      { id: 'q3', knowledgePointId: 'hundred', prompt: '瀛斿瓙鏄摢涓娲剧殑鍒涘浜猴紵', options: ['鍎掑', '閬撳', '澧ㄥ', '娉曞'], answerIndex: 0, explanation: '绠€鍗曪細鍎掑銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'hundred', prompt: '瀛斿瓙鐨勬€濇兂鍚庢潵鐢卞叾寮熷瓙鏁寸悊鎴愬摢鏈功锛?, options: ['銆婅璇€?, '銆婇亾寰风粡銆?, '銆婂瓱瀛愩€?, '銆婇煩闈炲瓙銆?], answerIndex: 0, explanation: '涓瓑锛氥€婅璇€嬨€? },
      { id: 'q5', knowledgePointId: 'hundred', prompt: '澧ㄥ瓙鏄摢涓娲剧殑鍒涘浜猴紵', options: ['澧ㄥ', '鍎掑', '閬撳', '娉曞'], answerIndex: 0, explanation: '涓瓑锛氬ⅷ瀹躲€? },
      { id: 'q6', knowledgePointId: 'hundred', prompt: '澧ㄥ瓙涓诲紶浠€涔堬紵', options: ['"鍏肩埍""闈炴敾"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?鍏肩埍""闈炴敾"銆? },
      { id: 'q7', knowledgePointId: 'hundred', prompt: '瀛斿瓙鐨勬牳蹇冩€濇兂鏄粈涔堬紵', options: ['"浠?', '"鍏肩埍"', '"闈炴敾"', '"娉曟不"'], answerIndex: 0, explanation: '涓瓑锛?浠?銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'hundred', prompt: '锛堜腑鑰冪湡棰橈級鑰佸瓙鏄摢涓娲剧殑鍒涘浜猴紵', options: ['閬撳', '鍎掑', '澧ㄥ', '娉曞'], answerIndex: 0, explanation: '鐪熼锛氶亾瀹躲€? },
      { id: 'q9', knowledgePointId: 'hundred', prompt: '锛堜腑鑰冪湡棰橈級瀛斿瓙鏄摢涓娲剧殑鍒涘浜猴紵', options: ['鍎掑', '閬撳', '澧ㄥ', '娉曞'], answerIndex: 0, explanation: '鐪熼锛氬剴瀹躲€? },
      { id: 'q10', knowledgePointId: 'hundred', prompt: '锛堜腑鑰冪湡棰橈級澧ㄥ瓙涓诲紶浠€涔堬紵', options: ['"鍏肩埍""闈炴敾"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?鍏肩埍""闈炴敾"銆? },
    ],
  },
  {
    id: 'his-7a-9', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡锛氱粺涓€澶氭皯鏃忓浗瀹剁殑寤虹珛鍜屽珐鍥?, edition: '缁熺紪鐗?, section: '绗?璇?绉︾粺涓€涓浗',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p9' },
    knowledgePoints: [
      { id: 'qin', title: '绉︾粺涓€涓浗', content: '鍏厓鍓?21骞达紝绉﹀浗瀹屾垚缁熶竴澶т笟锛屽缓绔嬬Е鏈濓紝瀹氶兘鍜搁槼銆傜Е缁熶竴鍚庯紝涓哄姞寮哄鍏ㄥ浗鐨勭粺娌伙紝绉︽湞鍒涚珛浜嗗ぇ涓€缁熺殑涓ぎ闆嗘潈鍒跺害銆傚浗瀹剁殑鏈€楂樼粺娌昏€呯О涓虹殗甯濓紝鎷ユ湁鑷抽珮鏃犱笂鐨勬潈濞侊紝鎬绘徑鍏ㄥ浗鐨勪竴鍒囧啗鏀垮ぇ鏉冦€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'qin', prompt: '鍏厓鍓?21骞达紝鍝釜鍥藉瀹屾垚缁熶竴澶т笟锛?, options: ['绉﹀浗', '榻愬浗', '妤氬浗', '璧靛浗'], answerIndex: 0, explanation: '绠€鍗曪細绉﹀浗銆? },
      { id: 'q2', knowledgePointId: 'qin', prompt: '寤虹珛浜嗕粈涔堟湞浠ｏ紵', options: ['绉︽湞', '姹夋湞', '鍛ㄦ湞', '鍟嗘湞'], answerIndex: 0, explanation: '绠€鍗曪細绉︽湞銆? },
      { id: 'q3', knowledgePointId: 'qin', prompt: '瀹氶兘鍝噷锛?, options: ['鍜搁槼', '闀垮畨', '娲涢槼', '鍖椾含'], answerIndex: 0, explanation: '绠€鍗曪細鍜搁槼銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'qin', prompt: '绉︾粺涓€鍚庯紝涓哄姞寮哄鍏ㄥ浗鐨勭粺娌伙紝绉︽湞鍒涚珛浜嗕粈涔堝埗搴︼紵', options: ['澶т竴缁熺殑涓ぎ闆嗘潈鍒跺害', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬ぇ涓€缁熺殑涓ぎ闆嗘潈鍒跺害銆? },
      { id: 'q5', knowledgePointId: 'qin', prompt: '鍥藉鐨勬渶楂樼粺娌昏€呯О涓猴紵', options: ['鐨囧笣', '鍥界帇', '鎬荤粺', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱殗甯濄€? },
      { id: 'q6', knowledgePointId: 'qin', prompt: '鐨囧笣鎷ユ湁鑷抽珮鏃犱笂鐨勬潈濞侊紝鎬绘徑鍏ㄥ浗鐨勪竴鍒囦粈涔堝ぇ鏉冿紵', options: ['鍐涙斂', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬啗鏀裤€? },
      { id: 'q7', knowledgePointId: 'qin', prompt: '涓轰簡閫傚簲鏂扮殑缁熶竴褰㈠娍锛屽姞寮哄皝寤虹粺娌伙紝绉︽湞鍒涚珛浜嗕竴濂楀皝寤轰笓鍒朵富涔夌殑浠€涔堝埗搴︼紵', options: ['涓ぎ闆嗘潈', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫腑澶泦鏉冦€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'qin', prompt: '锛堜腑鑰冪湡棰橈級鍏厓鍓?21骞达紝鍝釜鍥藉瀹屾垚缁熶竴澶т笟锛?, options: ['绉﹀浗', '榻愬浗', '妤氬浗', '璧靛浗'], answerIndex: 0, explanation: '鐪熼锛氱Е鍥姐€? },
      { id: 'q9', knowledgePointId: 'qin', prompt: '锛堜腑鑰冪湡棰橈級寤虹珛浜嗕粈涔堟湞浠ｏ紵', options: ['绉︽湞', '姹夋湞', '鍛ㄦ湞', '鍟嗘湞'], answerIndex: 0, explanation: '鐪熼锛氱Е鏈濄€? },
      { id: 'q10', knowledgePointId: 'qin', prompt: '锛堜腑鑰冪湡棰橈級鍥藉鐨勬渶楂樼粺娌昏€呯О涓猴紵', options: ['鐨囧笣', '鍥界帇', '鎬荤粺', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱殗甯濄€? },
    ],
  },
  {
    id: 'his-7a-10', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡锛氱粺涓€澶氭皯鏃忓浗瀹剁殑寤虹珛鍜屽珐鍥?, edition: '缁熺紪鐗?, section: '绗?0璇?绉︽湯鍐滄皯澶ц捣涔?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p10' },
    knowledgePoints: [
      { id: 'uprising', title: '绉︽湯鍐滄皯澶ц捣涔?, content: '鍏厓鍓?09骞达紝闄堣儨銆佸惔骞垮湪澶ф辰涔¤捣涔夈€傝繖鏄腑鍥藉巻鍙蹭笂绗竴娆″啘姘戝ぇ璧蜂箟銆傚叕鍏冨墠207骞达紝绉︽湞鐏骸銆傞殢鍚庯紝鍒橀偊鍜岄」缇戒负浜夊ず甯濅綅锛屽睍寮€鍘嗘椂鍥涘勾鐨勬垬浜夛紝鍙茬О"妤氭眽涔嬩簤"銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'uprising', prompt: '鍏厓鍓?09骞达紝璋佸湪澶ф辰涔¤捣涔夛紵', options: ['闄堣儨銆佸惔骞?, '鍒橀偊銆侀」缇?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細闄堣儨銆佸惔骞裤€? },
      { id: 'q2', knowledgePointId: 'uprising', prompt: '杩欐槸涓浗鍘嗗彶涓婄鍑犳鍐滄皯澶ц捣涔夛紵', options: ['绗竴娆?, '绗簩娆?, '绗笁娆?, '绗洓娆?], answerIndex: 0, explanation: '绠€鍗曪細绗竴娆°€? },
      { id: 'q3', knowledgePointId: 'uprising', prompt: '鍏厓鍓?07骞达紝鍝釜鏈濅唬鐏骸锛?, options: ['绉︽湞', '姹夋湞', '鍛ㄦ湞', '鍟嗘湞'], answerIndex: 0, explanation: '绠€鍗曪細绉︽湞銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'uprising', prompt: '闅忓悗锛岃皝鍜岄」缇戒负浜夊ず甯濅綅锛屽睍寮€鍘嗘椂鍥涘勾鐨勬垬浜夛紵', options: ['鍒橀偊', '闄堣儨', '鍚村箍', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬垬閭︺€? },
      { id: 'q5', knowledgePointId: 'uprising', prompt: '鍙茬О浠€涔堬紵', options: ['"妤氭眽涔嬩簤"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?妤氭眽涔嬩簤"銆? },
      { id: 'q6', knowledgePointId: 'uprising', prompt: '闄堣儨銆佸惔骞胯捣涔夌殑鍙ｅ彿鏄紵', options: ['"鐜嬩警灏嗙浉瀹佹湁绉嶄箮锛?', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?鐜嬩警灏嗙浉瀹佹湁绉嶄箮锛?' },
      { id: 'q7', knowledgePointId: 'uprising', prompt: '鏈€缁堣皝鎴樿儨浜嗛」缇斤紝寤虹珛浜嗘眽鏈濓紵', options: ['鍒橀偊', '闄堣儨', '鍚村箍', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬垬閭︺€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'uprising', prompt: '锛堜腑鑰冪湡棰橈級鍏厓鍓?09骞达紝璋佸湪澶ф辰涔¤捣涔夛紵', options: ['闄堣儨銆佸惔骞?, '鍒橀偊銆侀」缇?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氶檲鑳溿€佸惔骞裤€? },
      { id: 'q9', knowledgePointId: 'uprising', prompt: '锛堜腑鑰冪湡棰橈級杩欐槸涓浗鍘嗗彶涓婄鍑犳鍐滄皯澶ц捣涔夛紵', options: ['绗竴娆?, '绗簩娆?, '绗笁娆?, '绗洓娆?], answerIndex: 0, explanation: '鐪熼锛氱涓€娆°€? },
      { id: 'q10', knowledgePointId: 'uprising', prompt: '锛堜腑鑰冪湡棰橈級鍏厓鍓?07骞达紝鍝釜鏈濅唬鐏骸锛?, options: ['绉︽湞', '姹夋湞', '鍛ㄦ湞', '鍟嗘湞'], answerIndex: 0, explanation: '鐪熼锛氱Е鏈濄€? },
    ],
  },
  {
    id: 'his-7a-11', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡锛氱粺涓€澶氭皯鏃忓浗瀹剁殑寤虹珛鍜屽珐鍥?, edition: '缁熺紪鐗?, section: '绗?1璇?瑗挎眽寤虹珛鍜?鏂囨櫙涔嬫不"',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p11' },
    knowledgePoints: [
      { id: 'han', title: '瑗挎眽寤虹珛鍜?鏂囨櫙涔嬫不"', content: '鍏厓鍓?02骞达紝鍒橀偊寤虹珛姹夋湞锛屽畾閮介暱瀹夛紝鍙茬О瑗挎眽銆傚垬閭﹀氨鏄眽楂樼銆傛枃鏅椂鏈燂紝鏀挎不娓呮槑锛岀粡娴庡彂灞曪紝浜烘皯鐢熸椿瀹夊畾銆傝繖涓€鏃舵湡鐨勭粺娌诲眬闈紝鍘嗗彶涓婄О涓?鏂囨櫙涔嬫不"銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'han', prompt: '鍏厓鍓?02骞达紝璋佸缓绔嬫眽鏈濓紵', options: ['鍒橀偊', '椤圭窘', '闄堣儨', '鍚村箍'], answerIndex: 0, explanation: '绠€鍗曪細鍒橀偊銆? },
      { id: 'q2', knowledgePointId: 'han', prompt: '瀹氶兘鍝噷锛?, options: ['闀垮畨', '鍜搁槼', '娲涢槼', '鍖椾含'], answerIndex: 0, explanation: '绠€鍗曪細闀垮畨銆? },
      { id: 'q3', knowledgePointId: 'han', prompt: '鍙茬О浠€涔堬紵', options: ['瑗挎眽', '涓滄眽', '绉︽湞', '鍛ㄦ湞'], answerIndex: 0, explanation: '绠€鍗曪細瑗挎眽銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'han', prompt: '鍒橀偊灏辨槸锛?, options: ['姹夐珮绁?, '姹夋枃甯?, '姹夋櫙甯?, '姹夋甯?], answerIndex: 0, explanation: '涓瓑锛氭眽楂樼銆? },
      { id: 'q5', knowledgePointId: 'han', prompt: '鏂囨櫙鏃舵湡锛屾斂娌绘竻鏄庯紝缁忔祹鍙戝睍锛屼汉姘戠敓娲诲畨瀹氥€傝繖涓€鏃舵湡鐨勭粺娌诲眬闈紝鍘嗗彶涓婄О涓猴紵', options: ['"鏂囨櫙涔嬫不"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?鏂囨櫙涔嬫不"銆? },
      { id: 'q6', knowledgePointId: 'han', prompt: '姹夋枃甯濆拰姹夋櫙甯濇椂鏈燂紝鎻愬€′粈涔堟不鍥斤紵', options: ['浠ュ啘涓烘湰', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫互鍐滀负鏈€? },
      { id: 'q7', knowledgePointId: 'han', prompt: '姹夐珮绁栧惛鍙栫Е鏈濆洜鏆存斂瀵艰嚧閫熶骸鐨勬暀璁紝閲囧彇浜嗕粈涔堟斂绛栵紵', options: ['浼戝吇鐢熸伅', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫紤鍏荤敓鎭€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'han', prompt: '锛堜腑鑰冪湡棰橈級鍏厓鍓?02骞达紝璋佸缓绔嬫眽鏈濓紵', options: ['鍒橀偊', '椤圭窘', '闄堣儨', '鍚村箍'], answerIndex: 0, explanation: '鐪熼锛氬垬閭︺€? },
      { id: 'q9', knowledgePointId: 'han', prompt: '锛堜腑鑰冪湡棰橈級瀹氶兘鍝噷锛?, options: ['闀垮畨', '鍜搁槼', '娲涢槼', '鍖椾含'], answerIndex: 0, explanation: '鐪熼锛氶暱瀹夈€? },
      { id: 'q10', knowledgePointId: 'han', prompt: '锛堜腑鑰冪湡棰橈級鏂囨櫙鏃舵湡锛屾斂娌绘竻鏄庯紝缁忔祹鍙戝睍锛屼汉姘戠敓娲诲畨瀹氥€傝繖涓€鏃舵湡鐨勭粺娌诲眬闈紝鍘嗗彶涓婄О涓猴紵', options: ['"鏂囨櫙涔嬫不"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?鏂囨櫙涔嬫不"銆? },
    ],
  },
  {
    id: 'his-7a-12', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡锛氱粺涓€澶氭皯鏃忓浗瀹剁殑寤虹珛鍜屽珐鍥?, edition: '缁熺紪鐗?, section: '绗?2璇?姹夋甯濆珐鍥哄ぇ涓€缁熺帇鏈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p12' },
    knowledgePoints: [
      { id: 'wudi', title: '姹夋甯濆珐鍥哄ぇ涓€缁熺帇鏈?, content: '姹夋甯濋噰绾充富鐖跺亙鐨?鎺ㄦ仼"寤鸿锛屼笅璇忚瀹氳渚帇闄や互瀚￠暱瀛愮户鎵跨帇浣嶅锛屽彲灏嗗皝鍦板啀娆″垎灏佺粰鍏跺瓙寮熶綔涓轰警鍥斤紝鐢辩殗甯濆埗瀹氬皝鍙枫€傝繖鏍凤紝渚浗瓒婃潵瓒婂锛岃渚帇鐨勫皝鍦板拰鍔垮姏瓒婃潵瓒婂皬銆傛眽姝﹀笣杩樻帴鍙楄懀浠茶垝"缃㈤粶鐧惧锛岀嫭灏婂剴鏈?鐨勫缓璁紝鎶婂剴瀹跺璇寸珛涓烘缁熸€濇兂銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'wudi', prompt: '姹夋甯濋噰绾宠皝鐨?鎺ㄦ仼"寤鸿锛?, options: ['涓荤埗鍋?, '钁ｄ徊鑸?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細涓荤埗鍋冦€? },
      { id: 'q2', knowledgePointId: 'wudi', prompt: '姹夋甯濊繕鎺ュ彈璋?缃㈤粶鐧惧锛岀嫭灏婂剴鏈?鐨勫缓璁紵', options: ['钁ｄ徊鑸?, '涓荤埗鍋?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細钁ｄ徊鑸掋€? },
      { id: 'q3', knowledgePointId: 'wudi', prompt: '鎶婁粈涔堝璇寸珛涓烘缁熸€濇兂锛?, options: ['鍎掑', '閬撳', '澧ㄥ', '娉曞'], answerIndex: 0, explanation: '绠€鍗曪細鍎掑銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'wudi', prompt: '姹夋甯濆湪闀垮畨鍏村姙浠€涔堬紝浠ュ剴瀹剁殑銆婅瘲銆嬨€婁功銆嬨€婄ぜ銆嬨€婃槗銆嬨€婃槬绉嬨€嬩綔涓烘暀鏉愶紵', options: ['澶', '鍥藉瓙鐩?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬お瀛︺€? },
      { id: 'q5', knowledgePointId: 'wudi', prompt: '姹夋甯濇妸閾稿竵鏉冩敹褰掍腑澶紝缁熶竴閾搁€犱粈涔堥挶锛?, options: ['浜旈摙閽?, '鍦嗗舰鏂瑰瓟閽?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫簲閾㈤挶銆? },
      { id: 'q6', knowledgePointId: 'wudi', prompt: '姹夋甯濊繕鍦ㄥ叏鍥借寖鍥村唴缁熶竴璋冮厤鐗╄祫锛屽钩鎶戠墿浠凤紝杩欑鎺柦鍙仛锛?, options: ['鍧囪緭骞冲噯', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬潎杈撳钩鍑嗐€? },
      { id: 'q7', knowledgePointId: 'wudi', prompt: '姹夋甯濅粠鏀挎不銆佹€濇兂銆佺粡娴庣瓑鏂归潰宸╁浐浜嗗ぇ涓€缁熺殑灞€闈紝浣胯タ姹夌帇鏈濆紑濮嬭繘鍏ヤ粈涔堟椂鏈燂紵', options: ['榧庣洓', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶紟鐩涖€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'wudi', prompt: '锛堜腑鑰冪湡棰橈級姹夋甯濋噰绾宠皝鐨?鎺ㄦ仼"寤鸿锛?, options: ['涓荤埗鍋?, '钁ｄ徊鑸?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氫富鐖跺亙銆? },
      { id: 'q9', knowledgePointId: 'wudi', prompt: '锛堜腑鑰冪湡棰橈級姹夋甯濊繕鎺ュ彈璋?缃㈤粶鐧惧锛岀嫭灏婂剴鏈?鐨勫缓璁紵', options: ['钁ｄ徊鑸?, '涓荤埗鍋?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳懀浠茶垝銆? },
      { id: 'q10', knowledgePointId: 'wudi', prompt: '锛堜腑鑰冪湡棰橈級鎶婁粈涔堝璇寸珛涓烘缁熸€濇兂锛?, options: ['鍎掑', '閬撳', '澧ㄥ', '娉曞'], answerIndex: 0, explanation: '鐪熼锛氬剴瀹躲€? },
    ],
  },
  {
    id: 'his-7a-13', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡锛氱粺涓€澶氭皯鏃忓浗瀹剁殑寤虹珛鍜屽珐鍥?, edition: '缁熺紪鐗?, section: '绗?3璇?涓滄眽鐨勫叴琛?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p13' },
    knowledgePoints: [
      { id: 'eastern', title: '涓滄眽鐨勫叴琛?, content: '鍏厓25骞达紝鍒樼绉板笣锛屽畾閮芥礇闃筹紝鍙茬О涓滄眽銆傚垬绉€灏辨槸鍏夋甯濄€傚厜姝﹀笣缁熸不鍚庢湡锛岀ぞ浼氬嚭鐜颁簡姣旇緝瀹夊畾鐨勫眬闈紝缁忔祹寰楀埌鎭㈠鍜屽彂灞曪紝鍙茬О"鍏夋涓叴"銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'eastern', prompt: '鍏厓25骞达紝璋佺О甯濓紵', options: ['鍒樼', '鍒橀偊', '鍒樺交', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍒樼銆? },
      { id: 'q2', knowledgePointId: 'eastern', prompt: '瀹氶兘鍝噷锛?, options: ['娲涢槼', '闀垮畨', '鍜搁槼', '鍖椾含'], answerIndex: 0, explanation: '绠€鍗曪細娲涢槼銆? },
      { id: 'q3', knowledgePointId: 'eastern', prompt: '鍙茬О浠€涔堬紵', options: ['涓滄眽', '瑗挎眽', '绉︽湞', '鍛ㄦ湞'], answerIndex: 0, explanation: '绠€鍗曪細涓滄眽銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'eastern', prompt: '鍒樼灏辨槸锛?, options: ['鍏夋甯?, '姹夐珮绁?, '姹夋甯?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬厜姝﹀笣銆? },
      { id: 'q5', knowledgePointId: 'eastern', prompt: '鍏夋甯濈粺娌诲悗鏈燂紝绀句細鍑虹幇浜嗘瘮杈冨畨瀹氱殑灞€闈紝缁忔祹寰楀埌鎭㈠鍜屽彂灞曪紝鍙茬О锛?, options: ['"鍏夋涓叴"', '"鏂囨櫙涔嬫不"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?鍏夋涓叴"銆? },
      { id: 'q6', knowledgePointId: 'eastern', prompt: '涓滄眽涓湡浠ュ悗锛屽舰鎴愪簡浠€涔堜氦鏇夸笓鏉冪殑灞€闈紵', options: ['澶栨垰鍜屽瀹?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬鎴氬拰瀹﹀畼銆? },
      { id: 'q7', knowledgePointId: 'eastern', prompt: '184骞达紝鐖嗗彂浜嗕粈涔堣捣涔夛紵', options: ['榛勫肪璧蜂箟', '闄堣儨鍚村箍璧蜂箟', '鍒橀偊椤圭窘璧蜂箟', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶粍宸捐捣涔夈€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'eastern', prompt: '锛堜腑鑰冪湡棰橈級鍏厓25骞达紝璋佺О甯濓紵', options: ['鍒樼', '鍒橀偊', '鍒樺交', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬垬绉€銆? },
      { id: 'q9', knowledgePointId: 'eastern', prompt: '锛堜腑鑰冪湡棰橈級瀹氶兘鍝噷锛?, options: ['娲涢槼', '闀垮畨', '鍜搁槼', '鍖椾含'], answerIndex: 0, explanation: '鐪熼锛氭礇闃炽€? },
      { id: 'q10', knowledgePointId: 'eastern', prompt: '锛堜腑鑰冪湡棰橈級鍙茬О浠€涔堬紵', options: ['涓滄眽', '瑗挎眽', '绉︽湞', '鍛ㄦ湞'], answerIndex: 0, explanation: '鐪熼锛氫笢姹夈€? },
    ],
  },
  {
    id: 'his-7a-14', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡锛氱粺涓€澶氭皯鏃忓浗瀹剁殑寤虹珛鍜屽珐鍥?, edition: '缁熺紪鐗?, section: '绗?4璇?娌熼€氫腑澶栨枃鏄庣殑"涓濈桓涔嬭矾"',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p14' },
    knowledgePoints: [
      { id: 'silk', title: '娌熼€氫腑澶栨枃鏄庣殑"涓濈桓涔嬭矾"', content: '鍏厓鍓?38骞村拰鍏厓鍓?19骞达紝寮犻獮涓ゆ鍑轰娇瑗垮煙锛屾墦閫氫簡姹変笌瑗垮煙鐨勯€氶亾銆傝繖鏉￠亾璺紝浠庨暱瀹夊嚭鍙戯紝绌胯繃娌宠タ璧板粖锛岀粡瑗垮煙杩愬線涓簹銆佽タ浜氾紝鍐嶈浆杩愬埌鏇磋繙鐨勬娲诧紱鍙堟妸瑗垮煙鐨勭墿浜у拰濂囩弽寮傚疂杩愬埌涓師銆傝繖鏉℃矡閫氭浜氱殑闄嗕笂浜ら€氶亾璺紝灏辨槸钁楀悕鐨?涓濈桓涔嬭矾"銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'silk', prompt: '鍏厓鍓?38骞村拰鍏厓鍓?19骞达紝璋佷袱娆″嚭浣胯タ鍩燂紵', options: ['寮犻獮', '鐝秴', '鍙搁┈杩?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細寮犻獮銆? },
      { id: 'q2', knowledgePointId: 'silk', prompt: '杩欐潯閬撹矾浠庡摢閲屽嚭鍙戯紵', options: ['闀垮畨', '娲涢槼', '鍜搁槼', '鍖椾含'], answerIndex: 0, explanation: '绠€鍗曪細闀垮畨銆? },
      { id: 'q3', knowledgePointId: 'silk', prompt: '杩欐潯娌熼€氭浜氱殑闄嗕笂浜ら€氶亾璺紝灏辨槸钁楀悕鐨勶紵', options: ['"涓濈桓涔嬭矾"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細"涓濈桓涔嬭矾"銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'silk', prompt: '杩欐潯閬撹矾绌胯繃鍝噷锛?, options: ['娌宠タ璧板粖', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭渤瑗胯蛋寤娿€? },
      { id: 'q5', knowledgePointId: 'silk', prompt: '缁忚タ鍩熻繍寰€鍝噷锛?, options: ['涓簹銆佽タ浜?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫腑浜氥€佽タ浜氥€? },
      { id: 'q6', knowledgePointId: 'silk', prompt: '鍐嶈浆杩愬埌鏇磋繙鐨勶紵', options: ['娆ф床', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭娲层€? },
      { id: 'q7', knowledgePointId: 'silk', prompt: '鍏厓鍓?0骞达紝瑗挎眽鏈濆环璁剧疆浠€涔堬紝浣滀负绠＄悊瑗垮煙鐨勬渶楂橀暱瀹橈紵', options: ['瑗垮煙閮芥姢', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳タ鍩熼兘鎶ゃ€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'silk', prompt: '锛堜腑鑰冪湡棰橈級鍏厓鍓?38骞村拰鍏厓鍓?19骞达紝璋佷袱娆″嚭浣胯タ鍩燂紵', options: ['寮犻獮', '鐝秴', '鍙搁┈杩?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬紶楠炪€? },
      { id: 'q9', knowledgePointId: 'silk', prompt: '锛堜腑鑰冪湡棰橈級杩欐潯閬撹矾浠庡摢閲屽嚭鍙戯紵', options: ['闀垮畨', '娲涢槼', '鍜搁槼', '鍖椾含'], answerIndex: 0, explanation: '鐪熼锛氶暱瀹夈€? },
      { id: 'q10', knowledgePointId: 'silk', prompt: '锛堜腑鑰冪湡棰橈級杩欐潯娌熼€氭浜氱殑闄嗕笂浜ら€氶亾璺紝灏辨槸钁楀悕鐨勶紵', options: ['"涓濈桓涔嬭矾"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?涓濈桓涔嬭矾"銆? },
    ],
  },
  {
    id: 'his-7a-15', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 绉︽眽鏃舵湡锛氱粺涓€澶氭皯鏃忓浗瀹剁殑寤虹珛鍜屽珐鍥?, edition: '缁熺紪鐗?, section: '绗?5璇?涓ゆ眽鐨勭鎶€鍜屾枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p15' },
    knowledgePoints: [
      { id: 'tech', title: '涓ゆ眽鐨勭鎶€鍜屾枃鍖?, content: '涓滄眽鏃舵湡锛岃敗浼︽敼杩涗簡閫犵焊鏈€傚紶浠叉櫙鍐欐垚浜嗐€婁激瀵掓潅鐥呰銆嬩竴涔︼紝浠栬鍚庝笘绉颁负"鍖诲湥"銆傚崕浣楀彂鏄庝簡"楹绘哺鏁?銆傚徃椹縼缂栧啓鐨勩€婂彶璁般€嬶紝鏄腑鍥藉彜浠ｇ涓€閮ㄧ邯浼犱綋閫氬彶銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'tech', prompt: '涓滄眽鏃舵湡锛岃皝鏀硅繘浜嗛€犵焊鏈紵', options: ['钄′鸡', '寮犱徊鏅?, '鍗庝綏', '鍙搁┈杩?], answerIndex: 0, explanation: '绠€鍗曪細钄′鸡銆? },
      { id: 'q2', knowledgePointId: 'tech', prompt: '寮犱徊鏅啓鎴愪簡鍝湰涔︼紵', options: ['銆婁激瀵掓潅鐥呰銆?, '銆婃湰鑽夌翰鐩€?, '銆婂崈閲戞柟銆?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細銆婁激瀵掓潅鐥呰銆嬨€? },
      { id: 'q3', knowledgePointId: 'tech', prompt: '寮犱徊鏅鍚庝笘绉颁负锛?, options: ['"鍖诲湥"', '"鑽帇"', '"绁炲尰"', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細"鍖诲湥"銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'tech', prompt: '鍗庝綏鍙戞槑浜嗕粈涔堬紵', options: ['"楹绘哺鏁?', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?楹绘哺鏁?銆? },
      { id: 'q5', knowledgePointId: 'tech', prompt: '鍙搁┈杩佺紪鍐欎簡鍝湰涔︼紵', options: ['銆婂彶璁般€?, '銆婃眽涔︺€?, '銆婂悗姹変功銆?, '銆婁笁鍥藉織銆?], answerIndex: 0, explanation: '涓瓑锛氥€婂彶璁般€嬨€? },
      { id: 'q6', knowledgePointId: 'tech', prompt: '銆婂彶璁般€嬫槸涓浗鍙や唬绗竴閮ㄤ粈涔堜綋閫氬彶锛?, options: ['绾紶', '缂栧勾', '绾簨鏈湯', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱邯浼犮€? },
      { id: 'q7', knowledgePointId: 'tech', prompt: '銆婂彶璁般€嬭杩颁簡浠庝紶璇翠腑鐨勮皝鍒版眽姝﹀笣鏃剁害3000骞寸殑鍙蹭簨锛?, options: ['榛勫笣', '鐐庡笣', '灏?, '鑸?], answerIndex: 0, explanation: '涓瓑锛氶粍甯濄€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'tech', prompt: '锛堜腑鑰冪湡棰橈級涓滄眽鏃舵湡锛岃皝鏀硅繘浜嗛€犵焊鏈紵', options: ['钄′鸡', '寮犱徊鏅?, '鍗庝綏', '鍙搁┈杩?], answerIndex: 0, explanation: '鐪熼锛氳敗浼︺€? },
      { id: 'q9', knowledgePointId: 'tech', prompt: '锛堜腑鑰冪湡棰橈級寮犱徊鏅鍚庝笘绉颁负锛?, options: ['"鍖诲湥"', '"鑽帇"', '"绁炲尰"', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?鍖诲湥"銆? },
      { id: 'q10', knowledgePointId: 'tech', prompt: '锛堜腑鑰冪湡棰橈級鍙搁┈杩佺紪鍐欎簡鍝湰涔︼紵', options: ['銆婂彶璁般€?, '銆婃眽涔︺€?, '銆婂悗姹変功銆?, '銆婁笁鍥藉織銆?], answerIndex: 0, explanation: '鐪熼锛氥€婂彶璁般€嬨€? },
    ],
  },
  {
    id: 'his-7a-16', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈燂細鏀挎潈鍒嗙珛涓庢皯鏃忎氦铻?, edition: '缁熺紪鐗?, section: '绗?6璇?涓夊浗榧庣珛',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p16' },
    knowledgePoints: [
      { id: 'three', title: '涓夊浗榧庣珛', content: '200骞达紝鏇规搷鍜岃缁嶅湪瀹樻浮杩涜鍐虫垬銆傛浌鎿嶄互灏戣儨澶氾紝澶ц触琚佺粛銆備负浠ュ悗缁熶竴鍖楁柟鎵撲笅鍩虹銆?08骞达紝鏇规搷鍜屽瓩鍒樿仈鍐涘湪璧ゅ鍐虫垬銆傚瓩鍒樿仈鍐涗互灏戣儨澶氾紝澶ц触鏇规搷銆傝丹澹佷箣鎴樹负涓夊浗榧庣珛灞€闈㈢殑褰㈡垚濂犲畾浜嗗熀纭€銆?20骞达紝鏇逛笗搴熸帀姹夌尞甯濓紝鍦ㄦ礇闃崇О甯濓紝鍥藉彿榄忋€?21骞达紝鍒樺鍦ㄦ垚閮界О甯濓紝鍥藉彿姹夛紝鍙茬О铚€姹夈€?29骞达紝瀛欐潈鍦ㄥ缓涓氱О甯濓紝鍥藉彿鍚淬€備笁鍥介紟绔嬬殑灞€闈㈠舰鎴愩€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'three', prompt: '200骞达紝鏇规搷鍜岃缁嶅湪鍝噷杩涜鍐虫垬锛?, options: ['瀹樻浮', '璧ゅ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瀹樻浮銆? },
      { id: 'q2', knowledgePointId: 'three', prompt: '208骞达紝鏇规搷鍜屽瓩鍒樿仈鍐涘湪鍝噷鍐虫垬锛?, options: ['璧ゅ', '瀹樻浮', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細璧ゅ銆? },
      { id: 'q3', knowledgePointId: 'three', prompt: '璧ゅ涔嬫垬涓轰笁鍥介紟绔嬪眬闈㈢殑褰㈡垚濂犲畾浜嗭紵', options: ['鍩虹', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍩虹銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'three', prompt: '220骞达紝璋佸簾鎺夋眽鐚笣锛屽湪娲涢槼绉板笣锛屽浗鍙烽瓘锛?, options: ['鏇逛笗', '鍒樺', '瀛欐潈', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭浌涓曘€? },
      { id: 'q5', knowledgePointId: 'three', prompt: '221骞达紝璋佸湪鎴愰兘绉板笣锛屽浗鍙锋眽锛屽彶绉拌渶姹夛紵', options: ['鍒樺', '鏇逛笗', '瀛欐潈', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬垬澶囥€? },
      { id: 'q6', knowledgePointId: 'three', prompt: '229骞达紝璋佸湪寤轰笟绉板笣锛屽浗鍙峰惔锛?, options: ['瀛欐潈', '鏇逛笗', '鍒樺', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬瓩鏉冦€? },
      { id: 'q7', knowledgePointId: 'three', prompt: '涓夊浗榧庣珛鐨勫眬闈紵', options: ['褰㈡垚浜?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬舰鎴愪簡銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'three', prompt: '锛堜腑鑰冪湡棰橈級200骞达紝鏇规搷鍜岃缁嶅湪鍝噷杩涜鍐虫垬锛?, options: ['瀹樻浮', '璧ゅ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬畼娓°€? },
      { id: 'q9', knowledgePointId: 'three', prompt: '锛堜腑鑰冪湡棰橈級208骞达紝鏇规搷鍜屽瓩鍒樿仈鍐涘湪鍝噷鍐虫垬锛?, options: ['璧ゅ', '瀹樻浮', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳丹澹併€? },
      { id: 'q10', knowledgePointId: 'three', prompt: '锛堜腑鑰冪湡棰橈級璧ゅ涔嬫垬涓轰笁鍥介紟绔嬪眬闈㈢殑褰㈡垚濂犲畾浜嗭紵', options: ['鍩虹', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬熀纭€銆? },
    ],
  },
  {
    id: 'his-7a-17', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈燂細鏀挎潈鍒嗙珛涓庢皯鏃忎氦铻?, edition: '缁熺紪鐗?, section: '绗?7璇?瑗挎檵鐨勭煭鏆傜粺涓€鍜屽寳鏂瑰悇鏃忕殑鍐呰縼',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p17' },
    knowledgePoints: [
      { id: 'west', title: '瑗挎檵鐨勭煭鏆傜粺涓€鍜屽寳鏂瑰悇鏃忕殑鍐呰縼', content: '266骞达紝鍙搁┈鐐庡缓绔嬭タ鏅嬶紝瀹氶兘娲涢槼銆?80骞达紝瑗挎檵缁熶竴鍏ㄥ浗銆傝タ鏅嬪垵骞达紝鏅嬫甯濆ぇ灏佸悓濮撹鐜嬶紝鍚庢潵鍙堥檰缁淳閬ｈ鐜嬫嵁瀹堝窞閮￠噸闀囥€傝繖浜涘嚭闀囩殑瀹楀璇哥帇锛屾棦鎵嬫彙閲嶅叺锛屽張鎺岀姘戜簨锛屽娍鍔涙棩鐩婂己澶с€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'west', prompt: '266骞达紝璋佸缓绔嬭タ鏅嬶紵', options: ['鍙搁┈鐐?, '鍙搁┈鏄?, '鍙搁┈鎳?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍙搁┈鐐庛€? },
      { id: 'q2', knowledgePointId: 'west', prompt: '瀹氶兘鍝噷锛?, options: ['娲涢槼', '闀垮畨', '寤轰笟', '鎴愰兘'], answerIndex: 0, explanation: '绠€鍗曪細娲涢槼銆? },
      { id: 'q3', knowledgePointId: 'west', prompt: '280骞达紝瑗挎檵缁熶竴浜嗭紵', options: ['鍏ㄥ浗', '鍖楁柟', '鍗楁柟', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍏ㄥ浗銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'west', prompt: '鏅嬫甯濆ぇ灏佸悓濮擄紵', options: ['璇哥帇', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳鐜嬨€? },
      { id: 'q5', knowledgePointId: 'west', prompt: '杩欎簺鍑洪晣鐨勫畻瀹よ鐜嬶紝鏃㈡墜鎻￠噸鍏碉紝鍙堟帉绠★紵', options: ['姘戜簨', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭皯浜嬨€? },
      { id: 'q6', knowledgePointId: 'west', prompt: '鍔垮姏鏃ョ泭锛?, options: ['寮哄ぇ', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬己澶с€? },
      { id: 'q7', knowledgePointId: 'west', prompt: '涓滄眽銆侀瓘銆佹檵鏃舵湡锛屾垜鍥藉寳鏂圭殑娓哥墽姘戞棌涓嶆柇鍐呰縼銆傚唴杩佺殑姘戞棌涓昏鏈夊寛濂淬€侀矞鍗戙€佺警銆佹皭銆佺緦锛屽巻鍙蹭笂绉颁粬浠负锛?, options: ['"浜旇儭"', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?浜旇儭"銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'west', prompt: '锛堜腑鑰冪湡棰橈級266骞达紝璋佸缓绔嬭タ鏅嬶紵', options: ['鍙搁┈鐐?, '鍙搁┈鏄?, '鍙搁┈鎳?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬徃椹値銆? },
      { id: 'q9', knowledgePointId: 'west', prompt: '锛堜腑鑰冪湡棰橈級瀹氶兘鍝噷锛?, options: ['娲涢槼', '闀垮畨', '寤轰笟', '鎴愰兘'], answerIndex: 0, explanation: '鐪熼锛氭礇闃炽€? },
      { id: 'q10', knowledgePointId: 'west', prompt: '锛堜腑鑰冪湡棰橈級280骞达紝瑗挎檵缁熶竴浜嗭紵', options: ['鍏ㄥ浗', '鍖楁柟', '鍗楁柟', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬叏鍥姐€? },
    ],
  },
  {
    id: 'his-7a-18', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈燂細鏀挎潈鍒嗙珛涓庢皯鏃忎氦铻?, edition: '缁熺紪鐗?, section: '绗?8璇?涓滄檵鍗楁湞鏃舵湡姹熷崡鍦板尯鐨勫紑鍙?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p18' },
    knowledgePoints: [
      { id: 'jiangnan', title: '涓滄檵鍗楁湞鏃舵湡姹熷崡鍦板尯鐨勫紑鍙?, content: '瑗挎檵鏈勾浠ユ潵锛屽ぇ鎵瑰寳鏂逛汉姘戜负韬查伩鎴樼ジ鍗椾笅銆傚埌涓滄檵鍚庢湡锛岄暱姹熶腑涓嬫父鍦板尯甯冩弧浜嗗崡杩佺殑娴佹皯锛屽挨浠ユ睙鑻忎竴甯︿负澶氾紱鏈変竴閮ㄥ垎娴佹皯杩樼户缁崡涓嬶紝杩涘叆浠婂ぉ鐨勬禉姹熴€佺寤哄拰骞夸笢绛夊湴銆傚寳鏂逛汉鐨勫崡杩侊紝缁欐睙鍗楀湴鍖鸿緭閫佷簡澶ч噺鐨勫姵鍔ㄥ姏锛屼篃甯︽潵浜嗕腑鍘熷湴鍖哄厛杩涚殑鐢熶骇宸ュ叿鍜岀敓浜ф妧鏈€傛睙鍗楀湴鍖哄緱鍒板紑鍙戯紝缁忔祹杩呴€熷彂灞曡捣鏉ャ€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'jiangnan', prompt: '瑗挎檵鏈勾浠ユ潵锛屽ぇ鎵瑰寳鏂逛汉姘戜负韬查伩鎴樼ジ锛?, options: ['鍗椾笅', '鍖椾笂', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗椾笅銆? },
      { id: 'q2', knowledgePointId: 'jiangnan', prompt: '鍖楁柟浜虹殑鍗楄縼锛岀粰姹熷崡鍦板尯杈撻€佷簡澶ч噺鐨勶紵', options: ['鍔冲姩鍔?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍔冲姩鍔涖€? },
      { id: 'q3', knowledgePointId: 'jiangnan', prompt: '涔熷甫鏉ヤ簡涓師鍦板尯鍏堣繘鐨勭敓浜у伐鍏峰拰锛?, options: ['鐢熶骇鎶€鏈?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鐢熶骇鎶€鏈€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'jiangnan', prompt: '姹熷崡鍦板尯寰楀埌锛?, options: ['寮€鍙?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬紑鍙戙€? },
      { id: 'q5', knowledgePointId: 'jiangnan', prompt: '缁忔祹杩呴€燂紵', options: ['鍙戝睍璧锋潵', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬彂灞曡捣鏉ャ€? },
      { id: 'q6', knowledgePointId: 'jiangnan', prompt: '涓滄檵鐨勫缓绔嬭€呮槸锛?, options: ['鍙搁┈鐫?, '鍙搁┈鏄?, '鍙搁┈鎳?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬徃椹澘銆? },
      { id: 'q7', knowledgePointId: 'jiangnan', prompt: '涓滄檵鐨勯兘鍩庢槸锛?, options: ['寤哄悍', '娲涢槼', '闀垮畨', '鎴愰兘'], answerIndex: 0, explanation: '涓瓑锛氬缓搴枫€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'jiangnan', prompt: '锛堜腑鑰冪湡棰橈級瑗挎檵鏈勾浠ユ潵锛屽ぇ鎵瑰寳鏂逛汉姘戜负韬查伩鎴樼ジ锛?, options: ['鍗椾笅', '鍖椾笂', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬崡涓嬨€? },
      { id: 'q9', knowledgePointId: 'jiangnan', prompt: '锛堜腑鑰冪湡棰橈級鍖楁柟浜虹殑鍗楄縼锛岀粰姹熷崡鍦板尯杈撻€佷簡澶ч噺鐨勶紵', options: ['鍔冲姩鍔?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬姵鍔ㄥ姏銆? },
      { id: 'q10', knowledgePointId: 'jiangnan', prompt: '锛堜腑鑰冪湡棰橈級姹熷崡鍦板尯寰楀埌锛?, options: ['寮€鍙?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬紑鍙戙€? },
    ],
  },
  {
    id: 'his-7a-19', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈燂細鏀挎潈鍒嗙珛涓庢皯鏃忎氦铻?, edition: '缁熺紪鐗?, section: '绗?9璇?鍖楅瓘鏀挎不鍜屽寳鏂规皯鏃忓ぇ浜よ瀺',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p19' },
    knowledgePoints: [
      { id: 'beiwei', title: '鍖楅瓘鏀挎不鍜屽寳鏂规皯鏃忓ぇ浜よ瀺', content: '439骞达紝鍖楅瓘缁熶竴鍖楁柟锛岀粨鏉熶簡鍗佸叚鍥戒互鏉ュ垎瑁傚壊鎹殑灞€闈€傚寳榄忓瓭鏂囧笣鍗充綅鍚庯紝绔嬪織鐢ㄦ枃娌荤Щ椋庢槗淇椼€備粬鍔涙帓浼楄锛?94骞磋縼閮芥礇闃筹紝鎶婄櫨浣欎竾鍖呮嫭椴滃崙鏃忓湪鍐呯殑鍖楁柟鍚勬棌浜烘皯杩佸埌涓師銆備粬杩涗竴姝ユ帹琛屾眽鍖栨帾鏂斤紝瑙勫畾瀹樺憳鍦ㄦ湞寤蜂腑蹇呴』浣跨敤姹夎锛岀鐢ㄩ矞鍗戣锛涗互姹夋湇浠ｆ浛椴滃崙鏈嶏紱鏀归矞鍗戝涓烘眽濮擄紱榧撳姳椴滃崙璐垫棌涓庢眽浜鸿吹鏃忚仈濮荤瓑銆? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'beiwei', prompt: '439骞达紝鍝釜鏈濅唬缁熶竴鍖楁柟锛?, options: ['鍖楅瓘', '瑗挎檵', '涓滄檵', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍖楅瓘銆? },
      { id: 'q2', knowledgePointId: 'beiwei', prompt: '鍖楅瓘璋佸嵆浣嶅悗锛岀珛蹇楃敤鏂囨不绉婚鏄撲織锛?, options: ['瀛濇枃甯?, '姹夋甯?, '鍏夋甯?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瀛濇枃甯濄€? },
      { id: 'q3', knowledgePointId: 'beiwei', prompt: '494骞磋縼閮藉摢閲岋紵', options: ['娲涢槼', '闀垮畨', '寤哄悍', '鎴愰兘'], answerIndex: 0, explanation: '绠€鍗曪細娲涢槼銆? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'beiwei', prompt: '浠栬瀹氬畼鍛樺湪鏈濆环涓繀椤讳娇鐢ㄤ粈涔堣锛?, options: ['姹夎', '椴滃崙璇?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭眽璇€? },
      { id: 'q5', knowledgePointId: 'beiwei', prompt: '绂佺敤浠€涔堣锛?, options: ['椴滃崙璇?, '姹夎', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氶矞鍗戣銆? },
      { id: 'q6', knowledgePointId: 'beiwei', prompt: '浠ヤ粈涔堟湇浠ｆ浛椴滃崙鏈嶏紵', options: ['姹?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭眽銆? },
      { id: 'q7', knowledgePointId: 'beiwei', prompt: '鏀归矞鍗戝涓轰粈涔堝锛?, options: ['姹?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭眽銆? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'beiwei', prompt: '锛堜腑鑰冪湡棰橈級439骞达紝鍝釜鏈濅唬缁熶竴鍖楁柟锛?, options: ['鍖楅瓘', '瑗挎檵', '涓滄檵', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬寳榄忋€? },
      { id: 'q9', knowledgePointId: 'beiwei', prompt: '锛堜腑鑰冪湡棰橈級鍖楅瓘璋佸嵆浣嶅悗锛岀珛蹇楃敤鏂囨不绉婚鏄撲織锛?, options: ['瀛濇枃甯?, '姹夋甯?, '鍏夋甯?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬瓭鏂囧笣銆? },
      { id: 'q10', knowledgePointId: 'beiwei', prompt: '锛堜腑鑰冪湡棰橈級494骞磋縼閮藉摢閲岋紵', options: ['娲涢槼', '闀垮畨', '寤哄悍', '鎴愰兘'], answerIndex: 0, explanation: '鐪熼锛氭礇闃炽€? },
    ],
  },
  {
    id: 'his-7a-20', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓夊浗涓ゆ檵鍗楀寳鏈濇椂鏈燂細鏀挎潈鍒嗙珛涓庢皯鏃忎氦铻?, edition: '缁熺紪鐗?, section: '绗?0璇?榄忔檵鍗楀寳鏈濈殑绉戞妧涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'his7a', locator: 'p20' },
    knowledgePoints: [
      { id: 'weijin', title: '榄忔檵鍗楀寳鏈濈殑绉戞妧涓庢枃鍖?, content: '绁栧啿涔嬫妸鍦嗗懆鐜囩簿纭埌灏忔暟鐐逛互鍚庣殑绗竷浣嶆暟瀛楋紝鍗?.1415926鍜?.1415927涔嬮棿銆傝繖椤规垚鏋滈鍏堜笘鐣岃繎鍗冨勾銆傝淳鎬濆嫲鎾板啓鐨勩€婇綈姘戣鏈€嬶紝鏄垜鍥界幇瀛樻渶鏃╃殑涓€閮ㄥ畬鏁寸殑鍐滀功銆傜帇缇蹭箣鐨勪唬琛ㄤ綔鏄€婂叞浜泦搴忋€嬶紝浠栬鍚庝汉瑾変负"涔﹀湥"銆傞【鎭轰箣鐨勪唬琛ㄤ綔鏄€婂コ鍙茬鍥俱€嬪拰銆婃礇绁炶祴鍥俱€嬨€? },
    ],
    questions: [
      // 绠€鍗曢锛?閬擄級
      { id: 'q1', knowledgePointId: 'weijin', prompt: '璋佹妸鍦嗗懆鐜囩簿纭埌灏忔暟鐐逛互鍚庣殑绗竷浣嶆暟瀛楋紵', options: ['绁栧啿涔?, '璐炬€濆嫲', '鐜嬬静涔?, '椤炬伜涔?], answerIndex: 0, explanation: '绠€鍗曪細绁栧啿涔嬨€? },
      { id: 'q2', knowledgePointId: 'weijin', prompt: '杩欓」鎴愭灉棰嗗厛涓栫晫杩戝灏戝勾锛?, options: ['鍗冨勾', '鐧惧勾', '涓囧勾', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗冨勾銆? },
      { id: 'q3', knowledgePointId: 'weijin', prompt: '璐炬€濆嫲鎾板啓鐨勫摢鏈功锛屾槸鎴戝浗鐜板瓨鏈€鏃╃殑涓€閮ㄥ畬鏁寸殑鍐滀功锛?, options: ['銆婇綈姘戣鏈€?, '銆婃湰鑽夌翰鐩€?, '銆婂ぉ宸ュ紑鐗┿€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細銆婇綈姘戣鏈€嬨€? },
      // 涓瓑棰橈紙4閬擄級
      { id: 'q4', knowledgePointId: 'weijin', prompt: '鐜嬬静涔嬬殑浠ｈ〃浣滄槸锛?, options: ['銆婂叞浜泦搴忋€?, '銆婃竻鏄庝笂娌冲浘銆?, '銆婂コ鍙茬鍥俱€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婂叞浜泦搴忋€嬨€? },
      { id: 'q5', knowledgePointId: 'weijin', prompt: '鐜嬬静涔嬭鍚庝汉瑾変负锛?, options: ['"涔﹀湥"', '"鐢诲湥"', '"鍖诲湥"', '"璇楀湥"'], answerIndex: 0, explanation: '涓瓑锛?涔﹀湥"銆? },
      { id: 'q6', knowledgePointId: 'weijin', prompt: '椤炬伜涔嬬殑浠ｈ〃浣滄槸锛?, options: ['銆婂コ鍙茬鍥俱€?, '銆婂叞浜泦搴忋€?, '銆婃竻鏄庝笂娌冲浘銆?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婂コ鍙茬鍥俱€嬨€? },
      { id: 'q7', knowledgePointId: 'weijin', prompt: '椤炬伜涔嬬殑鍙︿竴閮ㄤ唬琛ㄤ綔鏄紵', options: ['銆婃礇绁炶祴鍥俱€?, '銆婂叞浜泦搴忋€?, '銆婃竻鏄庝笂娌冲浘銆?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婃礇绁炶祴鍥俱€嬨€? },
      // 鐪熼锛?閬擄級
      { id: 'q8', knowledgePointId: 'weijin', prompt: '锛堜腑鑰冪湡棰橈級璋佹妸鍦嗗懆鐜囩簿纭埌灏忔暟鐐逛互鍚庣殑绗竷浣嶆暟瀛楋紵', options: ['绁栧啿涔?, '璐炬€濆嫲', '鐜嬬静涔?, '椤炬伜涔?], answerIndex: 0, explanation: '鐪熼锛氱鍐蹭箣銆? },
      { id: 'q9', knowledgePointId: 'weijin', prompt: '锛堜腑鑰冪湡棰橈級杩欓」鎴愭灉棰嗗厛涓栫晫杩戝灏戝勾锛?, options: ['鍗冨勾', '鐧惧勾', '涓囧勾', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬崈骞淬€? },
      { id: 'q10', knowledgePointId: 'weijin', prompt: '锛堜腑鑰冪湡棰橈級璐炬€濆嫲鎾板啓鐨勫摢鏈功锛屾槸鎴戝浗鐜板瓨鏈€鏃╃殑涓€閮ㄥ畬鏁寸殑鍐滀功锛?, options: ['銆婇綈姘戣鏈€?, '銆婃湰鑽夌翰鐩€?, '銆婂ぉ宸ュ紑鐗┿€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氥€婇綈姘戣鏈€嬨€? },
    ],
  },
  {
    id: 'history-8a-1-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '閮ㄧ紪鐗?, section: '绗?璇?楦︾墖鎴樹簤',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p1' },
    knowledgePoints: [
      { id: 'opium', title: '铏庨棬閿€鐑?, content: '1839骞?鏈堬紝鏋楀垯寰愪笅浠ゅ皢缂磋幏鐨勫叏閮ㄩ甫鐗囷紝鍦ㄨ檸闂ㄦ捣婊╁綋浼楅攢姣併€傝檸闂ㄩ攢鐑熸槸涓浗浜烘皯绂佺儫鏂椾簤鐨勪紵澶ц儨鍒╋紝鏄剧ず浜嗕腑鍗庢皯鏃忓弽鎶楀鏉ヤ镜鐣ョ殑鍧氬己鎰忓織銆? },
      { id: 'war', title: '楦︾墖鎴樹簤', content: '1840骞?鏈堬紝楦︾墖鎴樹簤鐖嗗彂銆?842骞?鏈堬紝娓呮斂搴滆杩笌鑻卞浗绛捐浜嗕腑鍥借繎浠ｅ彶涓婄涓€涓抚鏉冭颈鍥界殑涓嶅钩绛夋潯绾︹€斺€斾腑鑻便€婂崡浜潯绾︺€嬨€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熺殑棰嗗浜烘槸锛?, options: ['鏋楀垯寰?, '鍏冲ぉ鍩?, '闄堝寲鎴?, '閬撳厜甯?], answerIndex: 0, explanation: '绠€鍗曪細鏋楀垯寰愩€? },
      { id: 'q2', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熷彂鐢熷湪鍝竴骞达紵', options: ['1839骞?, '1840骞?, '1842骞?, '1841骞?], answerIndex: 0, explanation: '绠€鍗曪細1839骞淬€? },
      { id: 'q3', knowledgePointId: 'war', prompt: '楦︾墖鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1840骞?, '1839骞?, '1842骞?, '1841骞?], answerIndex: 0, explanation: '绠€鍗曪細1840骞淬€? },
      { id: 'q4', knowledgePointId: 'war', prompt: '涓浗杩戜唬鍙蹭笂绗竴涓抚鏉冭颈鍥界殑涓嶅钩绛夋潯绾︽槸锛?, options: ['銆婂崡浜潯绾︺€?, '銆婂寳浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 0, explanation: '涓瓑锛氥€婂崡浜潯绾︺€嬨€? },
      { id: 'q5', knowledgePointId: 'war', prompt: '銆婂崡浜潯绾︺€嬬璁簬鍝竴骞达紵', options: ['1842骞?, '1840骞?, '1843骞?, '1841骞?], answerIndex: 0, explanation: '涓瓑锛?842骞淬€? },
      { id: 'q6', knowledgePointId: 'war', prompt: '銆婂崡浜潯绾︺€嬩腑鍓茶缁欒嫳鍥界殑鍦版柟鏄紵', options: ['棣欐腐宀?, '涔濋緳鍙?, '鏂扮晫', '骞垮窞'], answerIndex: 0, explanation: '涓瓑锛氶娓矝銆? },
      { id: 'q7', knowledgePointId: 'opium', prompt: '铏庨棬閿€鐑熸樉绀轰簡涓崕姘戞棌鎬庢牱鐨勭簿绁烇紵', options: ['鍙嶆姉澶栨潵渚电暐鐨勫潥寮烘剰蹇?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬弽鎶楀鏉ヤ镜鐣ョ殑鍧氬己鎰忓織銆? },
      { id: 'q8', knowledgePointId: 'opium', prompt: '锛堜腑鑰冪湡棰橈級铏庨棬閿€鐑熺殑棰嗗浜烘槸锛?, options: ['鏋楀垯寰?, '鍏冲ぉ鍩?, '闄堝寲鎴?, '閬撳厜甯?], answerIndex: 0, explanation: '鐪熼锛氭灄鍒欏緪銆? },
      { id: 'q9', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級楦︾墖鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1840骞?, '1839骞?, '1842骞?, '1841骞?], answerIndex: 0, explanation: '鐪熼锛?840骞淬€? },
      { id: 'q10', knowledgePointId: 'war', prompt: '锛堜腑鑰冪湡棰橈級涓浗杩戜唬鍙蹭笂绗竴涓抚鏉冭颈鍥界殑涓嶅钩绛夋潯绾︽槸锛?, options: ['銆婂崡浜潯绾︺€?, '銆婂寳浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 0, explanation: '鐪熼锛氥€婂崡浜潯绾︺€嬨€? },
    ],
  },
  {
    id: 'history-8a-1-2', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '閮ㄧ紪鐗?, section: '绗?璇?绗簩娆￠甫鐗囨垬浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p2' },
    knowledgePoints: [
      { id: 'second_opium', title: '绗簩娆￠甫鐗囨垬浜?, content: '1856骞?0鏈堣嚦1860骞?0鏈堬紝鑻辨硶鑱斿啗涓轰富鍑讹紝缇庝縿涓ゅ浗涓哄府鍑讹紝瀵逛腑鍥藉彂鍔ㄤ簡绗簩娆￠甫鐗囨垬浜夈€?860骞达紝鑻辨硶鑱斿啗鐏儳鍦嗘槑鍥€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'second_opium', prompt: '绗簩娆￠甫鐗囨垬浜夌垎鍙戜簬鍝竴骞达紵', options: ['1856骞?, '1840骞?, '1842骞?, '1851骞?], answerIndex: 0, explanation: '绠€鍗曪細1856骞淬€? },
      { id: 'q2', knowledgePointId: 'second_opium', prompt: '绗簩娆￠甫鐗囨垬浜夌殑涓诲嚩鏄紵', options: ['鑻辨硶鑱斿啗', '缇庝縿鑱斿啗', '鍏浗鑱斿啗', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鑻辨硶鑱斿啗銆? },
      { id: 'q3', knowledgePointId: 'second_opium', prompt: '鑻辨硶鑱斿啗鐏儳鍦嗘槑鍥槸鍦ㄥ摢涓€骞达紵', options: ['1860骞?, '1856骞?, '1858骞?, '1862骞?], answerIndex: 0, explanation: '绠€鍗曪細1860骞淬€? },
      { id: 'q4', knowledgePointId: 'second_opium', prompt: '绗簩娆￠甫鐗囨垬浜変腑锛岃幏鍒╂渶澶氱殑鍥藉鏄紵', options: ['淇勫浗', '鑻卞浗', '娉曞浗', '缇庡浗'], answerIndex: 0, explanation: '涓瓑锛氫縿鍥姐€? },
      { id: 'q5', knowledgePointId: 'second_opium', prompt: '淇勫浗鍏卞壊鍗犱腑鍥戒笢鍖楀拰瑗垮寳棰嗗湡澶氬皯涓囧钩鏂瑰叕閲岋紵', options: ['150澶氫竾', '100澶氫竾', '200澶氫竾', '50澶氫竾'], answerIndex: 0, explanation: '涓瓑锛?50澶氫竾骞虫柟鍏噷銆? },
      { id: 'q6', knowledgePointId: 'second_opium', prompt: '绗簩娆￠甫鐗囨垬浜夊悗锛屾竻鏀垮簻琚揩绛捐浜嗐€婂ぉ娲ユ潯绾︺€嬪拰锛?, options: ['銆婂寳浜潯绾︺€?, '銆婂崡浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 0, explanation: '涓瓑锛氥€婂寳浜潯绾︺€嬨€? },
      { id: 'q7', knowledgePointId: 'second_opium', prompt: '绗簩娆￠甫鐗囨垬浜変娇涓浗鐨勫崐娈栨皯鍦板寲绋嬪害锛?, options: ['杩涗竴姝ュ姞娣?, '寮€濮嬫拨涓?, '澶уぇ鍔犳繁', '瀹屽叏娌︿负'], answerIndex: 0, explanation: '涓瓑锛氳繘涓€姝ュ姞娣便€? },
      { id: 'q8', knowledgePointId: 'second_opium', prompt: '锛堜腑鑰冪湡棰橈級绗簩娆￠甫鐗囨垬浜夌垎鍙戜簬鍝竴骞达紵', options: ['1856骞?, '1840骞?, '1842骞?, '1851骞?], answerIndex: 0, explanation: '鐪熼锛?856骞淬€? },
      { id: 'q9', knowledgePointId: 'second_opium', prompt: '锛堜腑鑰冪湡棰橈級鑻辨硶鑱斿啗鐏儳鍦嗘槑鍥槸鍦ㄥ摢涓€骞达紵', options: ['1860骞?, '1856骞?, '1858骞?, '1862骞?], answerIndex: 0, explanation: '鐪熼锛?860骞淬€? },
      { id: 'q10', knowledgePointId: 'second_opium', prompt: '锛堜腑鑰冪湡棰橈級绗簩娆￠甫鐗囨垬浜変腑锛岃幏鍒╂渶澶氱殑鍥藉鏄紵', options: ['淇勫浗', '鑻卞浗', '娉曞浗', '缇庡浗'], answerIndex: 0, explanation: '鐪熼锛氫縿鍥姐€? },
    ],
  },

  {
    id: 'history-8a-1-3', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '閮ㄧ紪鐗?, section: '绗?璇?澶钩澶╁浗杩愬姩',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p3' },
    knowledgePoints: [
      { id: 'taiping', title: '澶钩澶╁浗杩愬姩', content: '1851骞?鏈?1鏃ワ紝娲鍏ㄥ湪骞胯タ妗傚钩鍘块噾鐢版潙鍙戝姩姝﹁璧蜂箟锛屽缓鍙峰お骞冲ぉ鍥斤紝璧蜂箟鍐涚О"澶钩鍐?銆?853骞?鏈堬紝澶钩鍐涙敾鍗犲崡浜紝灏嗗崡浜敼鍚嶄负澶╀含锛屼綔涓洪兘鍩庛€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩鐖嗗彂浜庡摢涓€骞达紵', options: ['1851骞?, '1840骞?, '1842骞?, '1856骞?], answerIndex: 0, explanation: '绠€鍗曪細1851骞淬€? },
      { id: 'q2', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩鐨勯琚栨槸锛?, options: ['娲鍏?, '鏉ㄧ娓?, '鐭宠揪寮€', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細娲鍏ㄣ€? },
      { id: 'q3', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩鐖嗗彂浜庡摢閲岋紵', options: ['骞胯タ妗傚钩鍘块噾鐢版潙', '骞夸笢骞垮窞', '婀栧崡闀挎矙', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細骞胯タ妗傚钩鍘块噾鐢版潙銆? },
      { id: 'q4', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗瀹氶兘鍦ㄥ摢閲岋紵', options: ['澶╀含', '鍖椾含', '涓婃捣', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬ぉ浜€? },
      { id: 'q5', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗棰佸竷鐨勭翰棰嗘€ф枃浠舵槸锛?, options: ['銆婂ぉ鏈濈敯浜╁埗搴︺€?, '銆婅祫鏀挎柊绡囥€?, '銆婂崡浜潯绾︺€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婂ぉ鏈濈敯浜╁埗搴︺€嬨€? },
      { id: 'q6', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩澶辫触鐨勬爣蹇楁槸锛?, options: ['澶╀含闄疯惤', '閲戠敯璧蜂箟', '瀹氶兘澶╀含', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬ぉ浜櫡钀姐€? },
      { id: 'q7', knowledgePointId: 'taiping', prompt: '澶钩澶╁浗杩愬姩鐨勬€ц川鏄紵', options: ['鍐滄皯闃剁骇鐨勫弽灏佸缓鍙嶄镜鐣ユ枟浜?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬啘姘戦樁绾х殑鍙嶅皝寤哄弽渚电暐鏂椾簤銆? },
      { id: 'q8', knowledgePointId: 'taiping', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗杩愬姩鐖嗗彂浜庡摢涓€骞达紵', options: ['1851骞?, '1840骞?, '1842骞?, '1856骞?], answerIndex: 0, explanation: '鐪熼锛?851骞淬€? },
      { id: 'q9', knowledgePointId: 'taiping', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗杩愬姩鐨勯琚栨槸锛?, options: ['娲鍏?, '鏉ㄧ娓?, '鐭宠揪寮€', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭椽绉€鍏ㄣ€? },
      { id: 'q10', knowledgePointId: 'taiping', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗棰佸竷鐨勭翰棰嗘€ф枃浠舵槸锛?, options: ['銆婂ぉ鏈濈敯浜╁埗搴︺€?, '銆婅祫鏀挎柊绡囥€?, '銆婂崡浜潯绾︺€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氥€婂ぉ鏈濈敯浜╁埗搴︺€嬨€? },
    ],
  },
  {
    id: 'history-8a-2-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 杩戜唬鍖栫殑鏃╂湡鎺㈢储涓庢皯鏃忓嵄鏈虹殑鍔犲墽', edition: '閮ㄧ紪鐗?, section: '绗?璇?娲嬪姟杩愬姩',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p4' },
    knowledgePoints: [
      { id: 'yangwu', title: '娲嬪姟杩愬姩', content: '绗簩娆￠甫鐗囨垬浜夊悗锛屾竻鏈濈粺娌婚泦鍥㈠唴閮ㄤ竴浜涙瘮杈冨紑鏄庣殑瀹樺憳锛屼富寮犲埄鐢ㄨタ鏂瑰厛杩涙妧鏈紝寮哄叺瀵屽浗锛岀淮鎶ゆ竻鐜嬫湞鐨勭粺娌汇€傝繖浜涘畼鍛樿绉颁负"娲嬪姟娲?銆備粠19涓栫邯60骞翠唬鍒?0骞翠唬锛屾磱鍔℃淳鎺€璧蜂簡涓€鍦?甯堝し闀挎妧浠ュ埗澶?鐨勬磱鍔¤繍鍔ㄣ€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩鐨勬椂闂存槸锛?, options: ['19涓栫邯60骞翠唬鍒?0骞翠唬', '19涓栫邯40骞翠唬鍒?0骞翠唬', '19涓栫邯70骞翠唬鍒?0骞翠唬', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細19涓栫邯60骞翠唬鍒?0骞翠唬銆? },
      { id: 'q2', knowledgePointId: 'yangwu', prompt: '娲嬪姟娲句富寮犲埄鐢ㄤ粈涔堢淮鎶ゆ竻鐜嬫湞鐨勭粺娌伙紵', options: ['瑗挎柟鍏堣繘鎶€鏈?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瑗挎柟鍏堣繘鎶€鏈€? },
      { id: 'q3', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩鐨勫彛鍙锋槸锛?, options: ['鑷己銆佹眰瀵?, '姘戜富銆佺瀛?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鑷己銆佹眰瀵屻€? },
      { id: 'q4', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩鐨勪唬琛ㄤ汉鐗╀笉鍖呮嫭锛?, options: ['搴锋湁涓?, '濂曚湥', '鏇惧浗钘?, '鏉庨缚绔?], answerIndex: 0, explanation: '涓瓑锛氬悍鏈変负銆? },
      { id: 'q5', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩鍓嶆湡浠?鑷己"涓哄彛鍙凤紝鍒涘姙浜嗕竴鎵癸紵', options: ['杩戜唬鍐涗簨宸ヤ笟', '杩戜唬姘戠敤宸ヤ笟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳繎浠ｅ啗浜嬪伐涓氥€? },
      { id: 'q6', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩鍚庢湡浠?姹傚瘜"涓哄彛鍙凤紝鍒涘姙浜嗕竴鎵癸紵', options: ['杩戜唬姘戠敤宸ヤ笟', '杩戜唬鍐涗簨宸ヤ笟', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳繎浠ｆ皯鐢ㄥ伐涓氥€? },
      { id: 'q7', knowledgePointId: 'yangwu', prompt: '娲嬪姟杩愬姩鐨勬€ц川鏄紵', options: ['鍦颁富闃剁骇鐨勮嚜鏁戣繍鍔?, '璧勪骇闃剁骇鏀硅壇杩愬姩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬湴涓婚樁绾х殑鑷晳杩愬姩銆? },
      { id: 'q8', knowledgePointId: 'yangwu', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩鐨勬椂闂存槸锛?, options: ['19涓栫邯60骞翠唬鍒?0骞翠唬', '19涓栫邯40骞翠唬鍒?0骞翠唬', '19涓栫邯70骞翠唬鍒?0骞翠唬', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛?9涓栫邯60骞翠唬鍒?0骞翠唬銆? },
      { id: 'q9', knowledgePointId: 'yangwu', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩鐨勫彛鍙锋槸锛?, options: ['鑷己銆佹眰瀵?, '姘戜富銆佺瀛?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳嚜寮恒€佹眰瀵屻€? },
      { id: 'q10', knowledgePointId: 'yangwu', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩鐨勬€ц川鏄紵', options: ['鍦颁富闃剁骇鐨勮嚜鏁戣繍鍔?, '璧勪骇闃剁骇鏀硅壇杩愬姩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬湴涓婚樁绾х殑鑷晳杩愬姩銆? },
    ],
  },

  {
    id: 'history-8a-2-2', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 杩戜唬鍖栫殑鏃╂湡鎺㈢储涓庢皯鏃忓嵄鏈虹殑鍔犲墽', edition: '閮ㄧ紪鐗?, section: '绗?璇?鐢插崍涓棩鎴樹簤涓庣摐鍒嗕腑鍥界媯娼?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p5' },
    knowledgePoints: [
      { id: 'jiawu', title: '鐢插崍涓棩鎴樹簤', content: '1894骞达紝鏃ユ湰鍙戝姩浜嗕镜鐣ヤ腑鍥界殑鐢插崍涓棩鎴樹簤銆?895骞达紝娓呮斂搴滆杩璁簡涓棩銆婇┈鍏虫潯绾︺€嬨€傘€婇┈鍏虫潯绾︺€嬩娇澶栧浗渚电暐鍔垮姏杩涗竴姝ユ繁鍏ヤ腑鍥借吂鍦帮紝澶уぇ鍔犳繁浜嗕腑鍥界殑鍗婃畺姘戝湴鍖栫▼搴︺€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'jiawu', prompt: '鐢插崍涓棩鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1894骞?, '1895骞?, '1898骞?, '1900骞?], answerIndex: 0, explanation: '绠€鍗曪細1894骞淬€? },
      { id: 'q2', knowledgePointId: 'jiawu', prompt: '鐢插崍涓棩鎴樹簤涓紝鍖楁磱鑸伴槦鍏ㄥ啗瑕嗘病鏄湪锛?, options: ['濞佹捣鍗垬褰?, '榛勬捣娴锋垬', '骞冲￥鎴樺焦', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細濞佹捣鍗垬褰广€? },
      { id: 'q3', knowledgePointId: 'jiawu', prompt: '鐢插崍涓棩鎴樹簤鍚庯紝娓呮斂搴滆杩璁簡锛?, options: ['銆婇┈鍏虫潯绾︺€?, '銆婂崡浜潯绾︺€?, '銆婅緵涓戞潯绾︺€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細銆婇┈鍏虫潯绾︺€嬨€? },
      { id: 'q4', knowledgePointId: 'jiawu', prompt: '銆婇┈鍏虫潯绾︺€嬬璁簬鍝竴骞达紵', options: ['1895骞?, '1894骞?, '1898骞?, '1900骞?], answerIndex: 0, explanation: '涓瓑锛?895骞淬€? },
      { id: 'q5', knowledgePointId: 'jiawu', prompt: '銆婇┈鍏虫潯绾︺€嬩腑锛屾竻鏀垮簻鍓茶浜嗗摢閲岀粰鏃ユ湰锛?, options: ['杈戒笢鍗婂矝銆佸彴婀惧叏宀涘強鎵€鏈夐檮灞炲悇宀涘笨銆佹編婀栧垪宀?, '棣欐腐宀?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳窘涓滃崐宀涖€佸彴婀惧叏宀涘強鎵€鏈夐檮灞炲悇宀涘笨銆佹編婀栧垪宀涖€? },
      { id: 'q6', knowledgePointId: 'jiawu', prompt: '銆婇┈鍏虫潯绾︺€嬩腑锛屾竻鏀垮簻璧斿伩鏃ユ湰鍏佃垂鐧介摱澶氬皯涓わ紵', options: ['2浜夸袱', '2100涓囦袱', '4.5浜夸袱', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?浜夸袱銆? },
      { id: 'q7', knowledgePointId: 'jiawu', prompt: '銆婇┈鍏虫潯绾︺€嬬殑褰卞搷鏄紵', options: ['澶уぇ鍔犳繁浜嗕腑鍥界殑鍗婃畺姘戝湴鍖栫▼搴?, '寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', '瀹屽叏娌︿负鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬ぇ澶у姞娣变簡涓浗鐨勫崐娈栨皯鍦板寲绋嬪害銆? },
      { id: 'q8', knowledgePointId: 'jiawu', prompt: '锛堜腑鑰冪湡棰橈級鐢插崍涓棩鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1894骞?, '1895骞?, '1898骞?, '1900骞?], answerIndex: 0, explanation: '鐪熼锛?894骞淬€? },
      { id: 'q9', knowledgePointId: 'jiawu', prompt: '锛堜腑鑰冪湡棰橈級鐢插崍涓棩鎴樹簤鍚庯紝娓呮斂搴滆杩璁簡锛?, options: ['銆婇┈鍏虫潯绾︺€?, '銆婂崡浜潯绾︺€?, '銆婅緵涓戞潯绾︺€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氥€婇┈鍏虫潯绾︺€嬨€? },
      { id: 'q10', knowledgePointId: 'jiawu', prompt: '锛堜腑鑰冪湡棰橈級銆婇┈鍏虫潯绾︺€嬬殑褰卞搷鏄紵', options: ['澶уぇ鍔犳繁浜嗕腑鍥界殑鍗婃畺姘戝湴鍖栫▼搴?, '寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', '瀹屽叏娌︿负鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬ぇ澶у姞娣变簡涓浗鐨勫崐娈栨皯鍦板寲绋嬪害銆? },
    ],
  },
  {
    id: 'history-8a-2-3', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 杩戜唬鍖栫殑鏃╂湡鎺㈢储涓庢皯鏃忓嵄鏈虹殑鍔犲墽', edition: '閮ㄧ紪鐗?, section: '绗?璇?鎴婃垖鍙樻硶',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p6' },
    knowledgePoints: [
      { id: 'wuxu', title: '鎴婃垖鍙樻硶', content: '1898骞?鏈?1鏃ワ紝娓呮斂搴滈甯?鏄庡畾鍥芥槸"璇忎功锛屽甯冨疄琛屽彉娉曘€傞殢鍚庯紝鍏夌华甯濆彂甯冧簡涓€绯诲垪鍙樻硶璇忎护銆傝繖娆″彉娉曞巻鏃?03澶╋紝鍥犳鍘嗗彶涓婄О涓?鐧炬棩缁存柊"銆?898骞?鏈?1鏃ワ紝鎱堢Η澶悗鍙戝姩鏀垮彉锛屽彉娉曞け璐ャ€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'wuxu', prompt: '鎴婃垖鍙樻硶寮€濮嬩簬鍝竴骞达紵', options: ['1898骞?, '1895骞?, '1894骞?, '1900骞?], answerIndex: 0, explanation: '绠€鍗曪細1898骞淬€? },
      { id: 'q2', knowledgePointId: 'wuxu', prompt: '鎴婃垖鍙樻硶鐨勯瀵间汉鏄紵', options: ['搴锋湁涓恒€佹鍚秴', '瀛欎腑灞便€侀粍鍏?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細搴锋湁涓恒€佹鍚秴銆? },
      { id: 'q3', knowledgePointId: 'wuxu', prompt: '鎴婃垖鍙樻硶鍙堣绉颁负锛?, options: ['鐧炬棩缁存柊', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鐧炬棩缁存柊銆? },
      { id: 'q4', knowledgePointId: 'wuxu', prompt: '鎴婃垖鍙樻硶鍘嗘椂澶氬皯澶╋紵', options: ['103澶?, '100澶?, '150澶?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?03澶┿€? },
      { id: 'q5', knowledgePointId: 'wuxu', prompt: '鎴婃垖鍙樻硶澶辫触鐨勬爣蹇楁槸锛?, options: ['鎱堢Η澶悗鍙戝姩鏀垮彉', '鍏夌华甯濆幓涓?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭厛绂уお鍚庡彂鍔ㄦ斂鍙樸€? },
      { id: 'q6', knowledgePointId: 'wuxu', prompt: '鎴婃垖鍙樻硶鐨勬€ц川鏄紵', options: ['璧勪骇闃剁骇鏀硅壇杩愬姩', '鍦颁富闃剁骇鑷晳杩愬姩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳祫浜ч樁绾ф敼鑹繍鍔ㄣ€? },
      { id: 'q7', knowledgePointId: 'wuxu', prompt: '鎴婃垖鍙樻硶鐨勪綔鐢ㄦ槸锛?, options: ['鍦ㄧぞ浼氫笂璧峰埌浜嗘€濇兂鍚挋鐨勪綔鐢?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬湪绀句細涓婅捣鍒颁簡鎬濇兂鍚挋鐨勪綔鐢ㄣ€? },
      { id: 'q8', knowledgePointId: 'wuxu', prompt: '锛堜腑鑰冪湡棰橈級鎴婃垖鍙樻硶寮€濮嬩簬鍝竴骞达紵', options: ['1898骞?, '1895骞?, '1894骞?, '1900骞?], answerIndex: 0, explanation: '鐪熼锛?898骞淬€? },
      { id: 'q9', knowledgePointId: 'wuxu', prompt: '锛堜腑鑰冪湡棰橈級鎴婃垖鍙樻硶鍙堣绉颁负锛?, options: ['鐧炬棩缁存柊', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氱櫨鏃ョ淮鏂般€? },
      { id: 'q10', knowledgePointId: 'wuxu', prompt: '锛堜腑鑰冪湡棰橈級鎴婃垖鍙樻硶鐨勬€ц川鏄紵', options: ['璧勪骇闃剁骇鏀硅壇杩愬姩', '鍦颁富闃剁骇鑷晳杩愬姩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳祫浜ч樁绾ф敼鑹繍鍔ㄣ€? },
    ],
  },
  {
    id: 'history-8a-2-4', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 杩戜唬鍖栫殑鏃╂湡鎺㈢储涓庢皯鏃忓嵄鏈虹殑鍔犲墽', edition: '閮ㄧ紪鐗?, section: '绗?璇?鎶楀嚮鍏浗鑱斿啗',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p7' },
    knowledgePoints: [
      { id: 'boxer', title: '鎶楀嚮鍏浗鑱斿啗', content: '1900骞?鏈堬紝涓洪晣鍘嬩箟鍜屽洟杩愬姩锛岃嫳銆佺編銆佷縿銆佹棩銆佹硶銆佸痉銆佹剰銆佸ゥ鍏浗缁勭粐鑱斿啗2000澶氫汉锛屽湪鑻卞浗娴峰啗鍙镐护瑗挎懇灏旂殑鐜囬涓嬶紝浠庡ぉ娲ュ悜鍖椾含杩涚姱銆?901骞达紝娓呮斂搴滆杩悓鑻便€佺編銆佷縿銆佹棩銆佹硶銆佸痉銆佹剰銆佸ゥ銆佹瘮銆佽嵎銆佽タ11鍥斤紝绛捐浜嗕抚鏉冭颈鍥界殑銆婅緵涓戞潯绾︺€嬨€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'boxer', prompt: '鍏浗鑱斿啗渚靛崕鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1900骞?, '1898骞?, '1895骞?, '1901骞?], answerIndex: 0, explanation: '绠€鍗曪細1900骞淬€? },
      { id: 'q2', knowledgePointId: 'boxer', prompt: '鍏浗鑱斿啗渚靛崕鐨勭洰鐨勬槸闀囧帇锛?, options: ['涔夊拰鍥㈣繍鍔?, '澶钩澶╁浗杩愬姩', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細涔夊拰鍥㈣繍鍔ㄣ€? },
      { id: 'q3', knowledgePointId: 'boxer', prompt: '鍏浗鑱斿啗涓嶅寘鎷摢涓浗瀹讹紵', options: ['钁¤悇鐗?, '鑻卞浗', '缇庡浗', '淇勫浗'], answerIndex: 0, explanation: '绠€鍗曪細钁¤悇鐗欍€? },
      { id: 'q4', knowledgePointId: 'boxer', prompt: '鍏浗鑱斿啗渚靛崕鎴樹簤鍚庯紝娓呮斂搴滆杩璁簡锛?, options: ['銆婅緵涓戞潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婂崡浜潯绾︺€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婅緵涓戞潯绾︺€嬨€? },
      { id: 'q5', knowledgePointId: 'boxer', prompt: '銆婅緵涓戞潯绾︺€嬬璁簬鍝竴骞达紵', options: ['1901骞?, '1900骞?, '1898骞?, '1895骞?], answerIndex: 0, explanation: '涓瓑锛?901骞淬€? },
      { id: 'q6', knowledgePointId: 'boxer', prompt: '銆婅緵涓戞潯绾︺€嬩腑锛屾竻鏀垮簻璧斿伩鐧介摱澶氬皯涓わ紵', options: ['4.5浜夸袱', '2浜夸袱', '2100涓囦袱', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?.5浜夸袱銆? },
      { id: 'q7', knowledgePointId: 'boxer', prompt: '銆婅緵涓戞潯绾︺€嬬殑褰卞搷鏄紵', options: ['涓浗瀹屽叏娌︿负鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '澶уぇ鍔犳繁浜嗕腑鍥界殑鍗婃畺姘戝湴鍖栫▼搴?, '寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫腑鍥藉畬鍏ㄦ拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細銆? },
      { id: 'q8', knowledgePointId: 'boxer', prompt: '锛堜腑鑰冪湡棰橈級鍏浗鑱斿啗渚靛崕鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1900骞?, '1898骞?, '1895骞?, '1901骞?], answerIndex: 0, explanation: '鐪熼锛?900骞淬€? },
      { id: 'q9', knowledgePointId: 'boxer', prompt: '锛堜腑鑰冪湡棰橈級鍏浗鑱斿啗渚靛崕鎴樹簤鍚庯紝娓呮斂搴滆杩璁簡锛?, options: ['銆婅緵涓戞潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婂崡浜潯绾︺€?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氥€婅緵涓戞潯绾︺€嬨€? },
      { id: 'q10', knowledgePointId: 'boxer', prompt: '锛堜腑鑰冪湡棰橈級銆婅緵涓戞潯绾︺€嬬殑褰卞搷鏄紵', options: ['涓浗瀹屽叏娌︿负鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '澶уぇ鍔犳繁浜嗕腑鍥界殑鍗婃畺姘戝湴鍖栫▼搴?, '寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氫腑鍥藉畬鍏ㄦ拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細銆? },
    ],
  },
  {
    id: 'history-8a-3-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 璧勪骇闃剁骇姘戜富闈╁懡涓庝腑鍗庢皯鍥界殑寤虹珛', edition: '閮ㄧ紪鐗?, section: '绗?璇?闈╁懡鍏堣鑰呭瓩涓北',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p8' },
    knowledgePoints: [
      { id: 'sun', title: '闈╁懡鍏堣鑰呭瓩涓北', content: '瀛欎腑灞辨槸涓浗杩戜唬姘戜富闈╁懡鐨勪紵澶у厛琛岃€呫€?894骞达紝瀛欎腑灞卞湪缇庡浗妾€棣欏北鑱斿悎鐖卞浗鍗庝鲸锛屾垚绔嬩簡涓浗绗竴涓祫浜ч樁绾ч潻鍛藉洟浣撯€斺€斿叴涓細銆?905骞达紝瀛欎腑灞卞湪鏃ユ湰涓滀含鎴愮珛浜嗕腑鍥界涓€涓叏鍥芥€х殑璧勪骇闃剁骇闈╁懡鏀垮厷鈥斺€斾腑鍥藉悓鐩熶細銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'sun', prompt: '涓浗杩戜唬姘戜富闈╁懡鐨勪紵澶у厛琛岃€呮槸锛?, options: ['瀛欎腑灞?, '搴锋湁涓?, '姊佸惎瓒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瀛欎腑灞便€? },
      { id: 'q2', knowledgePointId: 'sun', prompt: '涓浗绗竴涓祫浜ч樁绾ч潻鍛藉洟浣撴槸锛?, options: ['鍏翠腑浼?, '鍚岀洘浼?, '鍗庡叴浼?, '鍏夊浼?], answerIndex: 0, explanation: '绠€鍗曪細鍏翠腑浼氥€? },
      { id: 'q3', knowledgePointId: 'sun', prompt: '鍏翠腑浼氭垚绔嬩簬鍝竴骞达紵', options: ['1894骞?, '1905骞?, '1898骞?, '1911骞?], answerIndex: 0, explanation: '绠€鍗曪細1894骞淬€? },
      { id: 'q4', knowledgePointId: 'sun', prompt: '涓浗绗竴涓叏鍥芥€х殑璧勪骇闃剁骇闈╁懡鏀垮厷鏄紵', options: ['涓浗鍚岀洘浼?, '鍏翠腑浼?, '鍗庡叴浼?, '鍏夊浼?], answerIndex: 0, explanation: '涓瓑锛氫腑鍥藉悓鐩熶細銆? },
      { id: 'q5', knowledgePointId: 'sun', prompt: '涓浗鍚岀洘浼氭垚绔嬩簬鍝竴骞达紵', options: ['1905骞?, '1894骞?, '1898骞?, '1911骞?], answerIndex: 0, explanation: '涓瓑锛?905骞淬€? },
      { id: 'q6', knowledgePointId: 'sun', prompt: '涓浗鍚岀洘浼氱殑鏈哄叧鎶ユ槸锛?, options: ['銆婃皯鎶ャ€?, '銆婃椂鍔℃姤銆?, '銆婂浗闂绘姤銆?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婃皯鎶ャ€嬨€? },
      { id: 'q7', knowledgePointId: 'sun', prompt: '瀛欎腑灞辨彁鍑虹殑涓夋皯涓讳箟涓嶅寘鎷紵', options: ['姘戜富', '姘戞棌', '姘戞潈', '姘戠敓'], answerIndex: 0, explanation: '涓瓑锛氭皯涓汇€? },
      { id: 'q8', knowledgePointId: 'sun', prompt: '锛堜腑鑰冪湡棰橈級涓浗杩戜唬姘戜富闈╁懡鐨勪紵澶у厛琛岃€呮槸锛?, options: ['瀛欎腑灞?, '搴锋湁涓?, '姊佸惎瓒?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬瓩涓北銆? },
      { id: 'q9', knowledgePointId: 'sun', prompt: '锛堜腑鑰冪湡棰橈級涓浗绗竴涓祫浜ч樁绾ч潻鍛藉洟浣撴槸锛?, options: ['鍏翠腑浼?, '鍚岀洘浼?, '鍗庡叴浼?, '鍏夊浼?], answerIndex: 0, explanation: '鐪熼锛氬叴涓細銆? },
      { id: 'q10', knowledgePointId: 'sun', prompt: '锛堜腑鑰冪湡棰橈級涓浗绗竴涓叏鍥芥€х殑璧勪骇闃剁骇闈╁懡鏀垮厷鏄紵', options: ['涓浗鍚岀洘浼?, '鍏翠腑浼?, '鍗庡叴浼?, '鍏夊浼?], answerIndex: 0, explanation: '鐪熼锛氫腑鍥藉悓鐩熶細銆? },
    ],
  },
  {
    id: 'history-8a-3-2', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 璧勪骇闃剁骇姘戜富闈╁懡涓庝腑鍗庢皯鍥界殑寤虹珛', edition: '閮ㄧ紪鐗?, section: '绗?璇?杈涗亥闈╁懡',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p9' },
    knowledgePoints: [
      { id: 'xinhai', title: '杈涗亥闈╁懡', content: '1911骞?0鏈?0鏃ワ紝姝︽槍璧蜂箟鐖嗗彂銆傛鏄岃捣涔夎儨鍒╁悗锛屽悇鐪佺悍绾峰搷搴斻€?911骞存槸鍐滃巻杈涗亥骞达紝鍘嗗彶涓婄О杩欐闈╁懡涓?杈涗亥闈╁懡"銆傝緵浜ラ潻鍛芥帹缈讳簡娓呯帇鏈濈殑鍙嶅姩缁熸不锛屽鍛婁簡涓浗涓ゅ崈澶氬勾鍚涗富涓撳埗鍒跺害鐨勭粓缁撱€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'xinhai', prompt: '姝︽槍璧蜂箟鐖嗗彂浜庡摢涓€骞达紵', options: ['1911骞?, '1905骞?, '1894骞?, '1912骞?], answerIndex: 0, explanation: '绠€鍗曪細1911骞淬€? },
      { id: 'q2', knowledgePointId: 'xinhai', prompt: '姝︽槍璧蜂箟鐖嗗彂浜庡摢涓€澶╋紵', options: ['10鏈?0鏃?, '1鏈?鏃?, '10鏈?鏃?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細10鏈?0鏃ャ€? },
      { id: 'q3', knowledgePointId: 'xinhai', prompt: '1911骞存槸鍐滃巻杈涗亥骞达紝鍘嗗彶涓婄О杩欐闈╁懡涓猴紵', options: ['杈涗亥闈╁懡', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細杈涗亥闈╁懡銆? },
      { id: 'q4', knowledgePointId: 'xinhai', prompt: '杈涗亥闈╁懡鎺ㄧ炕浜嗗摢涓帇鏈濈殑鍙嶅姩缁熸不锛?, options: ['娓呯帇鏈?, '鏄庢湞', '鍏冩湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭竻鐜嬫湞銆? },
      { id: 'q5', knowledgePointId: 'xinhai', prompt: '杈涗亥闈╁懡瀹ｅ憡浜嗕腑鍥戒袱鍗冨骞翠粈涔堝埗搴︾殑缁堢粨锛?, options: ['鍚涗富涓撳埗鍒跺害', '灏佸缓鍒跺害', '璧勬湰涓讳箟鍒跺害', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氬悰涓讳笓鍒跺埗搴︺€? },
      { id: 'q6', knowledgePointId: 'xinhai', prompt: '杈涗亥闈╁懡鐨勬€ц川鏄紵', options: ['涓€娆′紵澶х殑璧勪骇闃剁骇姘戜富闈╁懡', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫竴娆′紵澶х殑璧勪骇闃剁骇姘戜富闈╁懡銆? },
      { id: 'q7', knowledgePointId: 'xinhai', prompt: '杈涗亥闈╁懡鐨勫巻鍙叉剰涔変笉鍖呮嫭锛?, options: ['鏀瑰彉浜嗕腑鍥藉崐娈栨皯鍦板崐灏佸缓鐨勭ぞ浼氭€ц川', '鎺ㄧ炕浜嗘竻鐜嬫湞鐨勫弽鍔ㄧ粺娌?, '瀹ｅ憡浜嗕腑鍥戒袱鍗冨骞村悰涓讳笓鍒跺埗搴︾殑缁堢粨', '寮€鍒涗簡瀹屽叏鎰忎箟涓婄殑杩戜唬姘戞棌姘戜富闈╁懡'], answerIndex: 0, explanation: '涓瓑锛氭敼鍙樹簡涓浗鍗婃畺姘戝湴鍗婂皝寤虹殑绀句細鎬ц川銆? },
      { id: 'q8', knowledgePointId: 'xinhai', prompt: '锛堜腑鑰冪湡棰橈級姝︽槍璧蜂箟鐖嗗彂浜庡摢涓€骞达紵', options: ['1911骞?, '1905骞?, '1894骞?, '1912骞?], answerIndex: 0, explanation: '鐪熼锛?911骞淬€? },
      { id: 'q9', knowledgePointId: 'xinhai', prompt: '锛堜腑鑰冪湡棰橈級杈涗亥闈╁懡鎺ㄧ炕浜嗗摢涓帇鏈濈殑鍙嶅姩缁熸不锛?, options: ['娓呯帇鏈?, '鏄庢湞', '鍏冩湞', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氭竻鐜嬫湞銆? },
      { id: 'q10', knowledgePointId: 'xinhai', prompt: '锛堜腑鑰冪湡棰橈級杈涗亥闈╁懡瀹ｅ憡浜嗕腑鍥戒袱鍗冨骞翠粈涔堝埗搴︾殑缁堢粨锛?, options: ['鍚涗富涓撳埗鍒跺害', '灏佸缓鍒跺害', '璧勬湰涓讳箟鍒跺害', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬悰涓讳笓鍒跺埗搴︺€? },
    ],
  },
  {
    id: 'history-8a-3-3', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 璧勪骇闃剁骇姘戜富闈╁懡涓庝腑鍗庢皯鍥界殑寤虹珛', edition: '閮ㄧ紪鐗?, section: '绗?0璇?涓崕姘戝浗鐨勫垱寤?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p10' },
    knowledgePoints: [
      { id: 'republic', title: '涓崕姘戝浗鐨勫垱寤?, content: '1912骞?鏈?鏃ワ紝瀛欎腑灞卞湪鍗椾含瀹ｈ獡灏变换涓存椂澶ф€荤粺锛屽鍛婁腑鍗庢皯鍥戒复鏃舵斂搴滄垚绔嬨€?912骞?鏈?2鏃ワ紝瀹ｇ粺甯濅笅璇忛€€浣嶏紝娓呮湞260澶氬勾鐨勭粺娌荤粨鏉熴€?912骞?鏈堬紝瀛欎腑灞遍甯冧簡鐢卞弬璁櫌鍒跺畾鐨勩€婁腑鍗庢皯鍥戒复鏃剁害娉曘€嬨€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'republic', prompt: '涓崕姘戝浗涓存椂鏀垮簻鎴愮珛浜庡摢涓€骞达紵', options: ['1912骞?, '1911骞?, '1915骞?, '1919骞?], answerIndex: 0, explanation: '绠€鍗曪細1912骞淬€? },
      { id: 'q2', knowledgePointId: 'republic', prompt: '涓崕姘戝浗涓存椂鏀垮簻鎴愮珛浜庡摢閲岋紵', options: ['鍗椾含', '鍖椾含', '涓婃捣', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍗椾含銆? },
      { id: 'q3', knowledgePointId: 'republic', prompt: '璋佸瑾撳氨浠讳复鏃跺ぇ鎬荤粺锛?, options: ['瀛欎腑灞?, '琚佷笘鍑?, '榛庡厓娲?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細瀛欎腑灞便€? },
      { id: 'q4', knowledgePointId: 'republic', prompt: '瀹ｇ粺甯濅笅璇忛€€浣嶆槸鍦ㄥ摢涓€骞达紵', options: ['1912骞?, '1911骞?, '1915骞?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?912骞淬€? },
      { id: 'q5', knowledgePointId: 'republic', prompt: '娓呮湞缁撴潫浜嗗灏戝勾鐨勭粺娌伙紵', options: ['260澶氬勾', '200澶氬勾', '300澶氬勾', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛?60澶氬勾銆? },
      { id: 'q6', knowledgePointId: 'republic', prompt: '瀛欎腑灞遍甯冧簡鐢卞弬璁櫌鍒跺畾鐨勶紵', options: ['銆婁腑鍗庢皯鍥戒复鏃剁害娉曘€?, '銆婁腑鍗庢皯鍥界害娉曘€?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氥€婁腑鍗庢皯鍥戒复鏃剁害娉曘€嬨€? },
      { id: 'q7', knowledgePointId: 'republic', prompt: '銆婁腑鍗庢皯鍥戒复鏃剁害娉曘€嬬殑鎬ц川鏄紵', options: ['涓浗鍘嗗彶涓婄涓€閮ㄨ祫浜ч樁绾у叡鍜屽浗瀹硶鎬ц川鐨勯噸瑕佹枃浠?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫腑鍥藉巻鍙蹭笂绗竴閮ㄨ祫浜ч樁绾у叡鍜屽浗瀹硶鎬ц川鐨勯噸瑕佹枃浠躲€? },
      { id: 'q8', knowledgePointId: 'republic', prompt: '锛堜腑鑰冪湡棰橈級涓崕姘戝浗涓存椂鏀垮簻鎴愮珛浜庡摢涓€骞达紵', options: ['1912骞?, '1911骞?, '1915骞?, '1919骞?], answerIndex: 0, explanation: '鐪熼锛?912骞淬€? },
      { id: 'q9', knowledgePointId: 'republic', prompt: '锛堜腑鑰冪湡棰橈級璋佸瑾撳氨浠讳复鏃跺ぇ鎬荤粺锛?, options: ['瀛欎腑灞?, '琚佷笘鍑?, '榛庡厓娲?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬瓩涓北銆? },
      { id: 'q10', knowledgePointId: 'republic', prompt: '锛堜腑鑰冪湡棰橈級銆婁腑鍗庢皯鍥戒复鏃剁害娉曘€嬬殑鎬ц川鏄紵', options: ['涓浗鍘嗗彶涓婄涓€閮ㄨ祫浜ч樁绾у叡鍜屽浗瀹硶鎬ц川鐨勯噸瑕佹枃浠?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氫腑鍥藉巻鍙蹭笂绗竴閮ㄨ祫浜ч樁绾у叡鍜屽浗瀹硶鎬ц川鐨勯噸瑕佹枃浠躲€? },
    ],
  },
  {
    id: 'history-8a-3-4', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 璧勪骇闃剁骇姘戜富闈╁懡涓庝腑鍗庢皯鍥界殑寤虹珛', edition: '閮ㄧ紪鐗?, section: '绗?1璇?鍖楁磱鏀垮簻鐨勭粺娌讳笌鍐涢榾鍓叉嵁',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'history8a', locator: 'p11' },
    knowledgePoints: [
      { id: 'warlord', title: '鍖楁磱鏀垮簻鐨勭粺娌讳笌鍐涢榾鍓叉嵁', content: '1912骞?鏈堬紝琚佷笘鍑湪鍖椾含灏变换涓崕姘戝浗涓存椂澶ф€荤粺锛岃緵浜ラ潻鍛界殑鏋滃疄琚涓栧嚡绐冨彇銆傝涓栧嚡姝诲悗锛屽寳娲嬪啗闃€鍒嗚锛屼腑鍥介櫡鍏ヤ簡鍐涢榾鍓叉嵁绾蜂簤鐨勫姩涔变箣涓€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'warlord', prompt: '琚佷笘鍑湪鍝噷灏变换涓崕姘戝浗涓存椂澶ф€荤粺锛?, options: ['鍖椾含', '鍗椾含', '涓婃捣', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍖椾含銆? },
      { id: 'q2', knowledgePointId: 'warlord', prompt: '杈涗亥闈╁懡鐨勬灉瀹炶璋佺獌鍙栦簡锛?, options: ['琚佷笘鍑?, '瀛欎腑灞?, '榛庡厓娲?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細琚佷笘鍑€? },
      { id: 'q3', knowledgePointId: 'warlord', prompt: '琚佷笘鍑鍚庯紝涓浗闄峰叆浜嗕粈涔堝眬闈紵', options: ['鍐涢榾鍓叉嵁绾蜂簤', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '绠€鍗曪細鍐涢榾鍓叉嵁绾蜂簤銆? },
      { id: 'q4', knowledgePointId: 'warlord', prompt: '琚佷笘鍑负浜嗗缓绔嬬嫭瑁佺粺娌伙紝涓€鍐嶇牬鍧忥紵', options: ['璐ｄ换鍐呴榿鍒?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氳矗浠诲唴闃佸埗銆? },
      { id: 'q5', knowledgePointId: 'warlord', prompt: '1915骞存湯锛岃涓栧嚡涓嬩护浠?916骞翠负锛?, options: ['涓崕甯濆浗娲鍏冨勾', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氫腑鍗庡笣鍥芥椽瀹厓骞淬€? },
      { id: 'q6', knowledgePointId: 'warlord', prompt: '琚佷笘鍑殑澶嶈緹娲诲姩锛屼护涓惧浗鍝楃劧銆傚瓩涓北鍙戣〃銆婅琚佸瑷€銆嬶紝鍙峰彫锛?, options: ['鐖卞浗璞澃鍏卞悓濂嬭捣锛岀淮鎶ゅ叡鍜屽埗搴?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氱埍鍥借豹鏉板叡鍚屽璧凤紝缁存姢鍏卞拰鍒跺害銆? },
      { id: 'q7', knowledgePointId: 'warlord', prompt: '1915骞村簳锛岃敗閿枫€佹潕鐑堥挧銆佸攼缁у哀鍦ㄤ簯鍗楀鍛婄嫭绔嬶紝缁勭粐鎶ゅ浗鍐涘寳涓婅琚侊紝浠€涔堢垎鍙戯紵', options: ['鎶ゅ浗鎴樹簤', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '涓瓑锛氭姢鍥芥垬浜夈€? },
      { id: 'q8', knowledgePointId: 'warlord', prompt: '锛堜腑鑰冪湡棰橈級琚佷笘鍑湪鍝噷灏变换涓崕姘戝浗涓存椂澶ф€荤粺锛?, options: ['鍖椾含', '鍗椾含', '涓婃捣', '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬寳浜€? },
      { id: 'q9', knowledgePointId: 'warlord', prompt: '锛堜腑鑰冪湡棰橈級杈涗亥闈╁懡鐨勬灉瀹炶璋佺獌鍙栦簡锛?, options: ['琚佷笘鍑?, '瀛欎腑灞?, '榛庡厓娲?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氳涓栧嚡銆? },
      { id: 'q10', knowledgePointId: 'warlord', prompt: '锛堜腑鑰冪湡棰橈級琚佷笘鍑鍚庯紝涓浗闄峰叆浜嗕粈涔堝眬闈紵', options: ['鍐涢榾鍓叉嵁绾蜂簤', '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?, '浠ヤ笂閮戒笉瀵?], answerIndex: 0, explanation: '鐪熼锛氬啗闃€鍓叉嵁绾蜂簤銆? },
    ],
  },
  {
    id: 'g-his-7b-1', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 闅嬪攼鏃舵湡锛氱箒鑽ｄ笌寮€鏀剧殑鏃朵唬', edition: '缁熺紪鐗?, section: '绗?璇?闅嬫湞缁熶竴涓庣伃浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '闅嬬殑缁熶竴', content: '581骞存潹鍧氬缓闅嬶紝589骞寸伃闄堢粺涓€鍏ㄥ浗銆? },
      { id: 'kp2', title: '澶ц繍娌充笌绉戜妇鍒?, content: '闅嬬個甯濆紑鍑垮ぇ杩愭渤锛屽垱绔嬭繘澹銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '闅嬫湞寤虹珛鐨勬椂闂村拰寤虹珛鑰呮槸', options: ['581骞存潹鍧?, '589骞存潹骞?, '618骞存潕娓?, '605骞存潹鍕?], answerIndex: 0, explanation: '绠€鍗曪細581骞存潹鍧氾紙闅嬫枃甯濓級寤洪殝銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '闅嬫湞缁熶竴鍏ㄥ浗銆佺粨鏉熷垎瑁傚眬闈㈢殑鏃堕棿鏄?, options: ['581骞?, '589骞?, '605骞?, '618骞?], answerIndex: 1, explanation: '绠€鍗曪細589骞寸伃闄堛€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '闅嬫湞澶ц繍娌崇殑涓績鏄?, options: ['闀垮畨', '娲涢槼', '娑块儭', '浣欐澀'], answerIndex: 1, explanation: '绠€鍗曪細浠ユ礇闃充负涓績銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '绉戜妇鍒舵寮忕‘绔嬬殑鏍囧織鏄?, options: ['闅嬫枃甯濆紑濮嬪垎绉戣€冭瘯', '闅嬬個甯濊绔嬭繘澹', '鍞愬お瀹楁墿鍏呭浗瀛?, '姝﹀垯澶╁垱绔嬫璇?], answerIndex: 1, explanation: '涓瓑锛氶殝鐐€甯濊杩涘＋绉戙€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '闅嬫枃甯濈粺娌绘椂鏈燂紝鍙茬О', options: ['寮€鐨囦箣娌?, '璐炶涔嬫不', '寮€鍏冪洓涓?, '鏂囨櫙涔嬫不'], answerIndex: 0, explanation: '涓瓑锛氬紑鐨囦箣娌汇€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '闅嬫湞鐏骸鐨勪富瑕佸師鍥犳槸', options: ['澶栨棌鍏ヤ镜', '闅嬬個甯濈殑鏆存斂', '鍐滄皯璧蜂箟鍚庡鎴氬ず鏉?, '瀹﹀畼涓撴潈'], answerIndex: 1, explanation: '涓瓑锛氭毚鏀垮紩鍙戝啘姘戣捣涔夈€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽敖閬撻殝浜′负姝ゆ渤锛岃嚦浠婂崈閲岃禆閫氭尝銆傝嫢鏃犳按娈块緳鑸熶簨锛屽叡绂硅鍔熶笉杈冨銆傘€嶈繖閲岀殑"娌?鏄寚', options: ['榛勬渤', '闅嬫湞澶ц繍娌?, '娣渤', '闀挎睙'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃瘎浠峰ぇ杩愭渤銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級闅嬫湞缁熶竴鐨勫巻鍙叉剰涔夋槸', options: ['缁撴潫浜嗛暱鏈熷垎瑁傚壊鎹眬闈?, '瀹炵幇浜嗘皯鏃忓ぇ杩佸緳', '纭珛浜嗙涓惧埗搴?, '寮€鍑夸簡澶ц繍娌?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粺涓€鎰忎箟銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝闅嬫湞澶ц繍娌充笌绉︽湞椹伴亾锛屽叡鍚岀偣鏄?, options: ['閮芥槸涓轰簡宸℃父', '閮藉姞寮轰簡鍚勫湴鑱旂郴銆佸珐鍥轰簡缁熶竴', '閮藉鑷翠簡鐜嬫湞绔嬪嵆鐏骸', '閮芥槸甯濈帇涓汉宸ョ▼'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽伐绋嬩綔鐢ㄣ€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绉戜妇鍒剁殑鍒涚珛锛屽叾杩涙鎬т富瑕佸湪浜?, options: ['淇濊瘉浜嗚吹鏃忕壒鏉?, '鎵撶牬闂ㄧ闄愬埗銆佷娇鏈夋墠瀛︾殑浜哄弬鏀?, '鍔犲己浜嗗瀹樻潈鍔?, '鍓婂急浜嗙殗甯濇潈鍔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄€夊畼鍒跺害鍙橀潻銆? },
    ],
  },

  {
    id: 'g-his-7b-2', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 闅嬪攼鏃舵湡锛氱箒鑽ｄ笌寮€鏀剧殑鏃朵唬', edition: '缁熺紪鐗?, section: '绗?璇?鍞愭湞寤虹珛涓?璐炶涔嬫不"',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍞愭湞寤虹珛', content: '618骞存潕娓婂缓鍞愶紝瀹氶兘闀垮畨銆? },
      { id: 'kp2', title: '璐炶涔嬫不涓庢鍒欏ぉ', content: '鏉庝笘姘戣礊瑙備箣娌伙紝姝﹀垯澶╂斂鍚紑鍏冦€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍞愭湞寤虹珛鐨勬椂闂村拰寤虹珛鑰呮槸', options: ['618骞存潕娓?, '618骞存潕涓栨皯', '626骞存潕娌?, '618骞存潕闅嗗熀'], answerIndex: 0, explanation: '绠€鍗曪細618骞村攼楂樼鏉庢笂寤哄攼銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鍞愬お瀹楃殑骞村彿鏄?, options: ['寮€鍏?, '璐炶', '寮€鐨?, '澶╁疂'], answerIndex: 1, explanation: '绠€鍗曪細鏉庝笘姘戝勾鍙疯礊瑙傘€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓浗鍘嗗彶涓婂敮涓€鐨勫コ鐨囧笣鏄?, options: ['鍚曞悗', '姝﹀垯澶?, '鎱堢Η', '瀛濆簞'], answerIndex: 1, explanation: '绠€鍗曪細姝﹀垯澶┿€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍞愬お瀹楃粺娌绘椂鏈燂紝鏀挎不娓呮槑銆佺粡娴庡彂灞曪紝鍙茬О', options: ['鏂囨櫙涔嬫不', '璐炶涔嬫不', '寮€鍏冪洓涓?, '搴蜂咕鐩涗笘'], answerIndex: 1, explanation: '涓瓑锛氳礊瑙備箣娌汇€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '琚攼澶畻姣斿柣涓?鐭ュ緱澶?鐨勪竴闈㈤暅瀛愮殑澶ц嚕鏄?, options: ['鎴跨巹榫?, '鏉滃鏅?, '榄忓緛', '椹懆'], answerIndex: 2, explanation: '涓瓑锛氶瓘寰佺洿璋忋€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '姝﹀垯澶╃粺娌绘椂鏈燂紝绀句細缁忔祹鎸佺画鍙戝睍锛屼汉绉板ス鐨勭粺娌讳负', options: ['璐炶閬楅銆佹斂鍚紑鍏?, '寮€鐨囦箣娌?, '鏂囨櫙涔嬫不', '鍏夋涓叴'], answerIndex: 0, explanation: '涓瓑锛氭斂鍚紑鍏冦€佹不瀹忚礊瑙傘€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼互鍙蹭负闀滐紝鍙互鐭ュ叴鏇匡紱浠ヤ汉涓洪暅锛屽彲浠ユ槑寰楀け銆傘€嶈杩欒瘽鐨勭殗甯濇槸', options: ['鍞愰珮绁?, '鍞愬お瀹?, '姝﹀垯澶?, '鍞愮巹瀹?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽攼澶畻绾宠皬銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級"璐炶涔嬫不"鍑虹幇鐨勪富瑕佸師鍥犱笉鍖呮嫭', options: ['鍚稿彇闅嬩骸鏁欒', '杞诲经钖勮祴銆佸姖璇惧啘妗?, '铏氬績绾宠皬銆佺煡浜哄杽浠?, '澶у叴鍦熸湪銆佸贰娓告棤搴?], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾不涓栧師鍥犮€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍞愬お瀹椾笌姝﹀垯澶╃粺娌伙紝鍏卞悓鐐规槸', options: ['閮介噸鐢ㄦ埧鐜勯緞鏉滃鏅?, '閮介噸瑙嗗彂灞曠敓浜с€侀€夋嫈璐ゆ墠', '閮芥槸寮€鍥藉悰涓?, '閮藉ぇ淇娈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾斂绛栧欢缁€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍞愭湞寤虹珛鐨勫巻鍙叉剰涔夋槸', options: ['缁撴潫浜嗛殝鏈垬涔便€佷负鐩涗笘濂犲熀', '缁熶竴浜嗗叏鍥芥墍鏈夌枂鍩?, '纭珛浜嗙涓惧埗', '寮€鍑夸簡澶ц繍娌?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽紑鍥芥剰涔夈€? },
    ],
  },

  {
    id: 'g-his-7b-3', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 闅嬪攼鏃舵湡锛氱箒鑽ｄ笌寮€鏀剧殑鏃朵唬', edition: '缁熺紪鐗?, section: '绗?璇?"寮€鍏冪洓涓?',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '寮€鍏冪洓涓?, content: '鍞愮巹瀹楀墠鏈熷勾鍙峰紑鍏冿紝鍞愭湞鍥藉姏榧庣洓銆? },
      { id: 'kp2', title: '鐩涘攼缁忔祹', content: '鏇茶緯鐘併€佺瓛杞︼紝闀垮畨鍥介檯澶ч兘浼氥€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '"寮€鍏?鏄笅鍒楀摢浣嶇殗甯濈殑骞村彿', options: ['鍞愬お瀹?, '姝﹀垯澶?, '鍞愮巹瀹?, '鍞愰珮绁?], answerIndex: 2, explanation: '绠€鍗曪細鍞愮巹瀹楀墠鏈熴€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鍞愭湞鍐滄皯鏀硅繘鐨勮€曚綔宸ュ叿鏄?, options: ['缈昏溅', '鏇茶緯鐘?, '姘存帓', '鑰ц溅'], answerIndex: 1, explanation: '绠€鍗曪細鏇茶緯鐘併€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍞愭湞鍏堣繘鐨勭亴婧夊伐鍏锋槸', options: ['绛掕溅', '缈昏溅', '妗旀', '杈樿匠'], answerIndex: 0, explanation: '绠€鍗曪細绛掕溅銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鍞愭湞鍥藉姏杈惧埌榧庣洓鏃舵湡锛屽彶绉?, options: ['璐炶涔嬫不', '璐炶閬楅', '寮€鍏冪洓涓?, '鏂囨櫙涔嬫不'], answerIndex: 2, explanation: '涓瓑锛氬紑鍏冪洓涓栥€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鍞愮巹瀹楀墠鏈熶换鐢ㄧ殑璐ょ浉鏄?, options: ['鎴跨巹榫勩€佹潨濡傛櫐', '濮氬磭銆佸畫鐠?, '榄忓緛銆侀┈鍛?, '鐙勪粊鏉?], answerIndex: 1, explanation: '涓瓑锛氬宕囧畫鐠熴€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鏃㈡槸褰撴椂涓浗鏀挎不銆佺粡娴庡拰鏂囧寲浜ゅ線涓績锛屼篃鏄竴搴у浗闄呮€уぇ閮戒細鐨勬槸', options: ['娲涢槼', '闀垮畨', '鎵窞', '鎴愰兘'], answerIndex: 1, explanation: '涓瓑锛氬攼閮介暱瀹夈€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?蹇嗘様寮€鍏冨叏鐩涙棩锛屽皬閭戠姽钘忎竾瀹跺銆傜ɑ绫虫祦鑴傜矡绫崇櫧锛屽叕绉佷粨寤勘涓板疄銆?杩欓璇楁弿杩扮殑鏄?, options: ['璐炶涔嬫不', '寮€鍏冪洓涓?, '寮€鐨囦箣娌?, '鏂囨櫙涔嬫不'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽紑鍏冨叏鐩涖€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級"寮€鍏冪洓涓?灞€闈㈠嚭鐜扮殑鍘熷洜涓嶅寘鎷?, options: ['绋冲畾鏀垮眬銆佸姳绮惧浘娌?, '閲嶇敤璐よ兘銆佹敼闈╁悘娌?, '鍙戝睍缁忔祹銆佹敼闈╃◣鍒?, '杩芥眰浜箰銆佷换浜哄敮浜?], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾不涓栨潯浠躲€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍞愰兘闀垮畨涓庤タ姹夐暱瀹夛紝鍞愪唬闀垮畨鏂板湪浜?, options: ['瑙勬ā鏇村皬', '鎴愪负鍥介檯澶ч兘浼氥€佸晢涓氱箒鑽?, '瀹炶鍧婂競瀹屽叏鍒嗙', '娌℃湁澶栨潵浜哄彛'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽煄甯傚彂灞曘€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級"璐炶涔嬫不"涓?寮€鍏冪洓涓?鐨勫叡鍚岀偣鏄?, options: ['閮藉嚭鐜板湪鍞愬お瀹楁椂鏈?, '閮芥槸鏀挎不娓呮槑銆佺粡娴庡彂灞曠殑娌讳笘', '閮藉洜鏆存斂鑰岀粨鏉?, '閮界敱濂崇殗甯濆紑鍒?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾不涓栨瘮杈冦€? },
    ],
  },

  {
    id: 'g-his-7b-4', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 闅嬪攼鏃舵湡锛氱箒鑽ｄ笌寮€鏀剧殑鏃朵唬', edition: '缁熺紪鐗?, section: '绗?璇?瀹夊彶涔嬩贡涓庡攼鏈濊“浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '瀹夊彶涔嬩贡', content: '755骞村畨绂勫北鍙叉€濇槑璧峰叺锛屽攼鐢辩洓杞“銆? },
      { id: 'kp2', title: '榛勫发璧蜂箟涓庝簲浠ｅ崄鍥?, content: '榛勫发璧蜂箟鐡﹁В鍞愮粺娌伙紝907骞村攼浜°€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '瀹夊彶涔嬩贡鐖嗗彂浜?, options: ['618骞?, '755骞?, '763骞?, '907骞?], answerIndex: 1, explanation: '绠€鍗曪細755骞淬€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍙戝姩瀹夊彶涔嬩贡鐨勪袱涓妭搴︿娇鏄?, options: ['瀹夌灞便€佸彶鎬濇槑', '瀹夌灞便€佹潹鍥藉繝', '閮瓙浠€佹潕鍏夊技', '鏉庢灄鐢€佹潹鍥藉繝'], answerIndex: 0, explanation: '绠€鍗曪細瀹夌灞卞彶鎬濇槑銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍞愭湞鐏骸浜?, options: ['755骞?, '875骞?, '907骞?, '960骞?], answerIndex: 2, explanation: '绠€鍗曪細907骞淬€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '瀹夊彶涔嬩贡鐨勫奖鍝嶆槸', options: ['鍞愭湞杈惧埌榧庣洓', '鍞愭湞鐢辩洓杞“銆佸舰鎴愯棭闀囧壊鎹?, '瀹炵幇鍥藉瀹屽叏缁熶竴', '鍑虹幇璐炶涔嬫不'], answerIndex: 1, explanation: '涓瓑锛氳浆鎶樼偣銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '缁欏攼鏈濈粺娌讳互鑷村懡鎵撳嚮鐨勫啘姘戣捣涔夋槸', options: ['榛勫肪璧蜂箟', '榛勫发璧蜂箟', '鏉庤嚜鎴愯捣涔?, '绾㈠肪鍐涜捣涔?], answerIndex: 1, explanation: '涓瓑锛氶粍宸㈣捣涔夈€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍞愭湞鐏骸鍚庯紝鍖楁柟榛勬渤娴佸煙鐩哥户鍑虹幇浜斾釜鏈濅唬锛屽彶绉?, options: ['鍗楀寳鏈?, '浜斾唬', '鍗佸浗', '鍗佸叚鍥?], answerIndex: 1, explanation: '涓瓑锛氫簲浠ｅ崄鍥姐€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?瀹夊彶涔嬩贡鎸佺画鍏勾锛屽寳鏂瑰湴鍖洪伃鍒版旦鍔€傚攼鏈濈殑鍥藉娍浠庢鐢辩洓杞“锛屽悇绉嶇煕鐩捐秺鏉ヨ秺灏栭攼銆?璇ヤ簨浠剁殑鍙戝姩鑰呮槸', options: ['瀹夌灞便€佸彶鎬濇槑', '榛勫发銆佺帇浠欒姖', '鏈辨俯銆佹潕鍏嬬敤', '瀹夌灞便€侀粍宸?], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽垽鏂簨浠躲€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級瀹夊彶涔嬩贡鐖嗗彂鐨勬牴鏈師鍥犳槸', options: ['鍞愮巹瀹楀悗鏈熸湞鏀胯厫璐ャ€佽妭搴︿娇鏉冨姏杩囧ぇ', '澶栨棌澶ц妯″叆渚?, '鍐滄皯璧蜂箟鐩存帴鐖嗗彂', '瀹﹀畼瀹屽叏涓撴潈'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀敱鐩涜浆琛般€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝瀹夊彶涔嬩贡涓庨粍宸㈣捣涔夛紝鍏卞悓鐐规槸', options: ['閮芥槸鑺傚害浣垮彌涔?, '閮芥矇閲嶆墦鍑讳簡鍞愭湞缁熸不', '閮界洿鎺ョ伃浜′簡鍞愭湞', '閮藉彂鐢熷湪鐩涘攼鏃舵湡'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽攼鏈濊“浜°€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級"娓旈槼榧欓紦鍔ㄥ湴鏉ワ紝鎯婄牬闇撹３缇借。鏇?鎻忓啓鐨勫巻鍙蹭簨浠舵槸', options: ['鐜勬闂ㄤ箣鍙?, '瀹夊彶涔嬩贡', '榛勫发璧蜂箟', '闄堟ˉ鍏靛彉'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃瘲姝屼腑鐨勫彶浜嬨€? },
    ],
  },

  {
    id: 'g-his-7b-5', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 闅嬪攼鏃舵湡锛氱箒鑽ｄ笌寮€鏀剧殑鏃朵唬', edition: '缁熺紪鐗?, section: '绗?璇?闅嬪攼鏃舵湡鐨勬皯鏃忎氦寰€涓庝氦铻?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍞愪笌鍚愯晝', content: '鏂囨垚鍏富鍏ヨ棌锛屽攼钑冨拰浜层€? },
      { id: 'kp2', title: '姘戞棌鏀跨瓥', content: '鍞愬お瀹楀疄琛屽紑鏄庢皯鏃忔斂绛栵紝琚皧涓?澶╁彲姹?銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp2', prompt: '鍞愬お瀹楀疄琛屽紑鏄庣殑姘戞棌鏀跨瓥锛屽緱鍒板懆杈瑰悇鏃忔嫢鎴达紝琚皧绉颁负', options: ['璧炴櫘', '澶╁彲姹?, '鍗曚簬', '鍙睏'], answerIndex: 1, explanation: '绠€鍗曪細澶╁彲姹椼€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '缁熶竴闈掕棌楂樺師銆佸缓绔嬪悙钑冩斂鏉冪殑鏄?, options: ['鏉捐禐骞插竷', '灏哄甫鐝犱腹', '楠ㄥ姏瑁寸綏', '澶х鑽?], answerIndex: 0, explanation: '绠€鍗曪細鏉捐禐骞插竷銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鏂囨垚鍏富鍏ヨ棌瀚佺粰鍚愯晝璧炴櫘鏄湪', options: ['鍞愰珮绁栨椂', '鍞愬お瀹楁椂', '姝﹀垯澶╂椂', '鍞愮巹瀹楁椂'], answerIndex: 1, explanation: '绠€鍗曪細鍞愬お瀹楁椂鏈熴€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鍞愭湞鏃讹紝缁熶竴鍚愯晝骞跺悜鍞愭眰濠氱殑鏄?, options: ['鏉捐禐骞插竷', '灏哄甫鐝犱腹', '鐨綏闃?, '楠ㄥ姏瑁寸綏'], answerIndex: 0, explanation: '涓瓑锛氭澗璧炲共甯冩眰浜层€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '8涓栫邯鍒濓紝鍞愭湞鍙堝皢鍝綅鍏富瀚佸埌鍚愯晝', options: ['鏂囨垚鍏富', '閲戝煄鍏富', '澶钩鍏富', '骞抽槼鍏富'], answerIndex: 1, explanation: '涓瓑锛氶噾鍩庡叕涓汇€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍞愭湞澶勭悊姘戞棌鍏崇郴鐨勬柟寮忎笉鍖呮嫭', options: ['鍜屼翰', '鍐屽皝', '璁剧疆鏈烘瀯绠¤緰', '寮鸿揩杩佸緳灞犳潃'], answerIndex: 3, explanation: '涓瓑锛氬紑鏄庢斂绛栥€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?鑷粠璐典富鍜屼翰鍚庯紝涓€鍗婅儭椋庝技姹夊銆?杩欓噷鐨?璐典富"鏄寚', options: ['鏂囨垚鍏富', '閲戝煄鍏富', '澶钩鍏富', '鏄悰'], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽攼钑冨拰浜层€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏂囨垚鍏富鍏ヨ棌鐨勫巻鍙叉剰涔夋槸', options: ['鍔犲己浜嗗攼钑冪粡娴庢枃鍖栦氦娴併€佸杩涗簡姹夎棌鍙嬪ソ', '浣胯タ钘忔寮忓綊灞炰腑澶?, '缁撴潫浜嗗悙钑冩斂鏉?, '鍚炲苟浜嗗悙钑?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽拰浜蹭綔鐢ㄣ€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝瑗挎眽鏄悰鍑哄涓庡攼鏈濇枃鎴愬叕涓诲叆钘忥紝鍏卞悓鐐规槸', options: ['閮藉彂鐢熷湪鍞愬お瀹楁椂鏈?, '閮芥槸鍜屼翰銆佷績杩涙皯鏃忓弸濂?, '閮戒娇瀵规柟鏀挎潈鐏骸', '閮芥槸鍏富琚揩杩滃珌'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽拰浜叉瘮杈冦€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍞愭湞瀹炶寮€鏄庢皯鏃忔斂绛栵紝鍙嶆槧鍑?, options: ['鍞愭湞鍥藉姏琛板急', '寮€鏀惧寘瀹圭殑鏃朵唬姘旇薄', '姘戞棌鐭涚浘灏栭攼', '鍥藉鍥涘垎浜旇'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾椂浠ｇ壒寰併€? },
    ],
  },

  {
    id: 'g-his-7b-6', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 闅嬪攼鏃舵湡锛氱箒鑽ｄ笌寮€鏀剧殑鏃朵唬', edition: '缁熺紪鐗?, section: '绗?璇?闅嬪攼鏃舵湡鐨勪腑澶栨枃鍖栦氦娴?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '閬ｅ攼浣夸笌閴寸湡涓滄浮', content: '鏃ユ湰閬ｅ攼浣匡紝閴寸湡鍏涓滄浮鏃ユ湰銆? },
      { id: 'kp2', title: '鐜勫瑗胯', content: '鐜勫瑗胯澶╃鍙栫粡锛岃憲銆婂ぇ鍞愯タ鍩熻銆嬨€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍞愭湞鏃讹紝鍏堝悗娲惧嚭鍗佸嚑鎵归仯鍞愪娇鏉ヤ腑鍥藉涔犵殑鍥藉鏄?, options: ['鏂扮綏', '鏃ユ湰', '澶ч', '澶╃'], answerIndex: 1, explanation: '绠€鍗曪細鏃ユ湰銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍏涓滄浮鏃ユ湰銆佷负涓棩鏂囧寲浜ゆ祦浣滃嚭鍗撹秺璐＄尞鐨勯珮鍍ф槸', options: ['鐜勫', '閴寸湡', '涓€琛?, '鎬€绱?], answerIndex: 1, explanation: '绠€鍗曪細閴寸湡銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '璐炶骞撮棿锛岃タ琛屽ぉ绔哄彇缁忕殑楂樺儳鏄?, options: ['閴寸湡', '鐜勫', '涔夊噣', '娉曟樉'], answerIndex: 1, explanation: '绠€鍗曪細鐜勫銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏍规嵁鐜勫鍙ｈ堪銆佺敱寮熷瓙璁板綍鎴愪功鐨勮憲浣滄槸', options: ['銆婅タ娓歌銆?, '銆婂ぇ鍞愯タ鍩熻銆?, '銆婇┈鍙尝缃楄绾€?, '銆婂緪闇炲娓歌銆?], answerIndex: 1, explanation: '涓瓑锛氥€婂ぇ鍞愯タ鍩熻銆嬨€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '閴寸湡涓滄浮鏃ユ湰鍚庯紝涓绘寔淇缓鐨勮憲鍚嶅缓绛戞槸', options: ['鐧介┈瀵?, '鍞愭嫑鎻愬', '澶ф槶瀵?, '灏戞灄瀵?], answerIndex: 1, explanation: '涓瓑锛氬攼鎷涙彁瀵恒€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鐜勫瑗胯鐨勭洰鐨勫湴鏄粖澶╃殑', options: ['鏃ユ湰', '鍗板害鍗婂矝', '闃挎媺浼崐宀?, '涓簹'], answerIndex: 1, explanation: '涓瓑锛氬ぉ绔哄嵆鍗板害銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?涓€涓儳浜轰粠澶╃姹傚褰掓潵锛屽甫鍥炲ぇ閲忎經缁忥紝寮熷瓙鎹叾鍙ｈ堪鍐欐垚鐮旂┒涓浜ゆ祦鍙茬殑鐝嶈吹鏂囩尞銆?璇ュ儳浜烘槸', options: ['閴寸湡', '鐜勫', '涔夊噣', '娉曟樉'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽垽鏂汉鐗┿€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級閴寸湡涓滄浮涓庣巹濂樿タ琛岀殑鍏卞悓浣滅敤鏄?, options: ['閮藉埌鏃ユ湰浼犳暀', '閮戒績杩涗簡涓鏂囧寲浜ゆ祦', '閮戒粠涓浗鍒板嵃搴?, '閮界敱娴疯矾鍑鸿'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽澶栦氦娴併€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝閴寸湡涓滄浮涓庣巹濂樿タ琛岋紝鏂瑰悜涓婄殑涓嶅悓鏄?, options: ['閴寸湡瑗胯銆佺巹濂樹笢娓?, '閴寸湡涓滄浮鏃ユ湰銆佺巹濂樿タ琛屽ぉ绔?, '閮藉悜瑗?, '閮藉悜涓?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾柟鍚戝樊寮傘€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級闅嬪攼鏃舵湡瀵瑰浜ゆ祦棰戠箒鐨勬牴鏈師鍥犳槸', options: ['瀵瑰浜ら€氬彂杈?, '鍞愭湞鍏堣繘绻佽崳銆佹湁宸ㄥぇ鍚稿紩鍔?, '瀵瑰鏀跨瓥寮€鏀?, '澶栧浗浜哄悜寰€涓浗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀箒鑽ｅ紑鏀俱€? },
    ],
  },

  {
    id: 'g-his-7b-7', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 闅嬪攼鏃舵湡锛氱箒鑽ｄ笌寮€鏀剧殑鏃朵唬', edition: '缁熺紪鐗?, section: '绗?璇?闅嬪攼鏃舵湡鐨勭鎶€涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '闆曠増鍗板埛涓庣伀鑽?, content: '銆婇噾鍒氱粡銆嬮洉鐗堝嵃鍒凤紝鐏嵂鍞愭湯鐢ㄤ簬鍐涗簨銆? },
      { id: 'kp2', title: '鍞愯瘲涓庝功娉?, content: '鏉庣櫧銆佹潨鐢€佺櫧灞呮槗锛涢鐪熷嵖銆佹煶鍏潈銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓栫晫涓婄幇瀛樻渶鏃╃殑銆佹爣鏈夌‘鍒囨棩鏈熺殑闆曠増鍗板埛鍝佹槸', options: ['銆婂湥缁忋€?, '銆婇噾鍒氱粡銆嬶紙鍞愬捀閫氫節骞达級', '銆婂彜鍏扮粡銆?, '銆婅瘲缁忋€?], answerIndex: 1, explanation: '绠€鍗曪細鍞愭湞銆婇噾鍒氱粡銆嬨€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鐏嵂寮€濮嬬敤浜庡啗浜嬫槸鍦?, options: ['闅嬫湞', '鍞愭湞鏈勾', '鍖楀畫', '鍗楀畫'], answerIndex: 1, explanation: '绠€鍗曪細鍞愭湯銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '琚О涓?璇椾粰"鐨勫攼鏈濊瘲浜烘槸', options: ['鏉滅敨', '鏉庣櫧', '鐧藉眳鏄?, '鐜嬬淮'], answerIndex: 1, explanation: '绠€鍗曪細鏉庣櫧銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '琚О涓?璇楀湥"鐨勫攼鏈濊瘲浜烘槸', options: ['鏉庣櫧', '鏉滅敨', '鐧藉眳鏄?, '鏉庡晢闅?], answerIndex: 1, explanation: '涓瓑锛氭潨鐢€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鏉滅敨鐨勮瘲琚О涓?, options: ['璇楀彶', '璇椾綑', '璇楅', '璇椾經'], answerIndex: 0, explanation: '涓瓑锛氳瘲鍙层€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍞愭湞涔︽硶瀹堕鐪熷嵖鐨勪功娉曠壒鐐规槸', options: ['闆勬祽鏁﹀帤', '鏂规姌宄讳附', '鐦︾‖瀵掍凯', '椋橀€稿浠?], answerIndex: 0, explanation: '涓瓑锛氶浣撻泟娴戙€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?鍦ㄥ攼鏈濓紝浜轰滑宸茬粡鑳藉闆曠増鍗板埛涔︾睄銆傜幇瀛樻渶鏃╃殑闆曠増鍗板埛鍝佸嵃鍒朵簬868骞淬€?璇ュ嵃鍒峰搧鏄?, options: ['銆婂攼鏈崏銆?, '銆婇噾鍒氱粡銆?, '銆婂崈閲戞柟銆?, '銆婅尪缁忋€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄洉鐗堝嵃鍒枫€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍞愯瘲绻佽崳鐨勬牴鏈師鍥犳槸', options: ['绉戜妇鑰冭瘯浠ヨ瘲璧嬪彇澹?, '鍞愭湞缁忔祹绻佽崳銆佺ぞ浼氬紑鏀?, '鐨囧笣鐑埍璇楁瓕', '涓浜ゆ祦棰戠箒'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鍖栫箒鑽ｃ€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏉庣櫧涓庢潨鐢瘲姝岄鏍硷紝姝ｇ‘鐨勬槸', options: ['鏉庣櫧娌夐儊椤挎尗銆佹潨鐢豹杩堝鏀?, '鏉庣櫧璞繄椋橀€搞€佹潨鐢矇閮佹偛鎬?, '涓や汉椋庢牸瀹屽叏鐩稿悓', '涓や汉閮芥槸鐜板疄涓讳箟璇椾汉'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾潕鏉滄瘮杈冦€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級闆曠増鍗板埛鏈彂鏄庣殑鎰忎箟鏄?, options: ['浣夸功绫嶅彲浠ュぇ閲忓嵃鍒躲€佷績杩涙枃鍖栦紶鎾?, '浣挎枃瀛楀紑濮嬪嚭鐜?, '浣块€犵焊鏈鍙栦唬', '浣跨涓惧埗琚簾闄?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀鎶€褰卞搷銆? },
    ],
  },

  {
    id: 'g-his-7b-8', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 杈藉畫澶忛噾鍏冩椂鏈燂細姘戞棌鍏崇郴鍙戝睍鍜岀ぞ浼氬彉鍖?, edition: '缁熺紪鐗?, section: '绗?璇?鍖楀畫鐨勬斂娌?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍖楀畫寤虹珛', content: '960骞磋档鍖¤儰闄堟ˉ鍏靛彉锛屽畾閮戒笢浜紙寮€灏侊級銆? },
      { id: 'kp2', title: '閲嶆枃杞绘鏀跨瓥', content: '瀹嬪お绁栧姞寮轰腑澶泦鏉冿紝宕囨枃鎶戞銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍖楀畫寤虹珛鐨勬椂闂村拰寤虹珛鑰呮槸', options: ['907骞磋档鍖¤儰', '960骞磋档鍖¤儰', '960骞磋档鍏変箟', '1005骞磋档鎭?], answerIndex: 1, explanation: '绠€鍗曪細960骞撮檲妗ュ叺鍙樸€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍖楀畫鐨勯兘鍩庢槸浠婂ぉ鐨?, options: ['娲涢槼', '寮€灏?, '鏉窞', '鍗椾含'], answerIndex: 1, explanation: '绠€鍗曪細涓滀含姹存銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '璧靛尅鑳ゅず鍙栨斂鏉冪殑浜嬩欢鏄?, options: ['鐜勬闂ㄤ箣鍙?, '闄堟ˉ鍏靛彉', '闈栧悍涔嬪彉', '鍦熸湪鍫′箣鍙?], answerIndex: 1, explanation: '绠€鍗曪細闄堟ˉ椹垮叺鍙樸€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '瀹嬪お绁栦负鍔犲己涓ぎ闆嗘潈锛岄鍏堜粠鍝竴闂鍏ユ墜', options: ['闆嗕腑璐㈡潈', '瑙ｉ櫎绂佸啗灏嗛鍏垫潈', '娲炬枃鑷ｄ换鐭ュ窞', '鍒嗗寲浜嬫潈'], answerIndex: 1, explanation: '涓瓑锛氭澂閰掗噴鍏垫潈銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍖楀畫鍥界瓥鐨勭獊鍑虹壒鐐规槸', options: ['灏氭杞绘枃', '閲嶆枃杞绘', '鏂囨骞堕噸', '閲嶅啘鎶戝晢'], answerIndex: 1, explanation: '涓瓑锛氬磭鏂囨姂姝︺€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍖楀畫涓洪槻姝㈢煡宸炴潈鍔涜繃澶э紝閲囧彇鐨勬帾鏂戒笉鍖呮嫭', options: ['涓夊勾涓€鎹?, '璁剧疆閫氬垽', '棰戠箒璋冨姩', '涓栬缁熸不'], answerIndex: 3, explanation: '涓瓑锛氬姞寮烘帶鍒躲€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?鍋氫汉鑾仛鍐涳紝鍋氶搧鑾仛閽堛€?杩欏弽鏄犱簡鍖楀畫', options: ['灏氭椋庢皵鐩涜', '閲嶆枃杞绘鏀跨瓥', '鍐涢槦鎴樻枟鍔涘己', '鍐涗汉鍦颁綅楂?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄噸鏂囪交姝︺€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍖楀畫閲嶆枃杞绘鏀跨瓥鐨勭Н鏋佷綔鐢ㄦ槸', options: ['鎻愰珮浜嗗啗闃熸垬鏂楀姏', '鏈夊埄浜庢斂鏉冪ǔ鍥哄拰绀句細瀹夊畾', '鍔犲己浜嗗湴鏂规潈鍔?, '娑堥櫎浜嗚竟鎮?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾斂绛栧奖鍝嶃€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝瀹嬪お绁栦笌姹夋甯濆姞寮轰腑澶泦鏉冿紝鍏卞悓鐐规槸', options: ['閮借В闄よ妭搴︿娇鍏垫潈', '閮戒粠鍐涗簨銆佹斂娌汇€佺粡娴庝笂鍓婂急鍦版柟', '閮芥帹琛屽垎灏?, '閮藉疄琛屼紤鍏荤敓鎭?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄泦鏉冩瘮杈冦€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級闄堟ˉ鍏靛彉鐨勫巻鍙插奖鍝嶆槸', options: ['缁撴潫浜嗕簲浠ｅ崄鍥藉垎瑁傚眬闈?, '寤虹珛浜嗗寳瀹嬨€佸紑濮嬪眬閮ㄧ粺涓€', '瀹炵幇浜嗗叏鍥藉ぇ涓€缁?, '鐏骸浜嗗攼鏈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽紑鍥芥剰涔夈€? },
    ],
  },

  {
    id: 'g-his-7b-9', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 杈藉畫澶忛噾鍏冩椂鏈燂細姘戞棌鍏崇郴鍙戝睍鍜岀ぞ浼氬彉鍖?, edition: '缁熺紪鐗?, section: '绗?璇?杈姐€佽タ澶忎笌鍖楀畫骞剁珛',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '濂戜腹寤哄浗涓庢径娓婁箣鐩?, content: '10涓栫邯鍒濋樋淇濇満寤哄涓癸紝1005骞存径娓婁箣鐩熴€? },
      { id: 'kp2', title: '瑗垮寤虹珛涓庡畫澶忓拰鎴?, content: '11涓栫邯鍏冩槉寤鸿タ澶忋€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '10涓栫邯鍒濓紝缁熶竴濂戜腹鍚勯儴銆佸缓绔嬫斂鏉冪殑鏄?, options: ['鍏冩槉', '闃夸繚鏈?, '闃块鎵?, '鏉捐禐骞插竷'], answerIndex: 1, explanation: '绠€鍗曪細鑰跺緥闃夸繚鏈恒€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '杈戒笌鍖楀畫璁㈢珛"婢舵笂涔嬬洘"鏄湪', options: ['1004骞?, '1005骞?, '1044骞?, '1125骞?], answerIndex: 1, explanation: '绠€鍗曪細1005骞淬€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '11涓栫邯鍓嶆湡锛岀О澶у鐨囧笣銆佸缓绔嬭タ澶忕殑鏄?, options: ['闃夸繚鏈?, '鍏冩槉', '闃块鎵?, '閾佹湪鐪?], answerIndex: 1, explanation: '绠€鍗曪細鍏冩槉銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '婢舵笂涔嬬洘鏃讹紝鍖楀畫浜插緛鐨勭殗甯濇槸', options: ['瀹嬪お绁?, '瀹嬪お瀹?, '瀹嬬湡瀹?, '瀹嬩粊瀹?], answerIndex: 2, explanation: '涓瓑锛氬畫鐪熷畻銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '婢舵笂涔嬬洘瑙勫畾锛岃窘瀹嬪弻鏂?, options: ['杈藉悜瀹嬬О鑷?, '瀹嬬粰杈藉瞾甯併€佸弻鏂圭害涓哄厔寮熶箣鍥?, '瀹嬪壊璁╃嚂浜戝崄鍏窞', '鍙屾柟浜掍笉寰€鏉?], answerIndex: 1, explanation: '涓瓑锛氬瞾甯佹崲鍜屽钩銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '瑗垮鐨勫缓绔嬭€呭厓鏄婃槸鍝竴姘戞棌鐨勯棰?, options: ['濂戜腹鏃?, '鍏氶」鏃?, '濂崇湡鏃?, '钂欏彜鏃?], answerIndex: 1, explanation: '涓瓑锛氬厷椤规棌銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?澶у畫鐨囧笣璋ㄨ嚧瑾撲功浜庡ぇ濂戜腹鐨囧笣闃欎笅锛氬叡閬垫垚淇★紝铏斿娆㈢洘鈥︹€︿互椋庡湡涔嬪疁锛屽姪鍐涙梾涔嬭垂銆?杩欐槸鍝竴鐩熺害', options: ['瀹嬪鍜岀害', '婢舵笂涔嬬洘', '缁嶅叴鍜岃', '灏煎竷妤氭潯绾?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾径娓婁箣鐩熴€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級瀵规径娓婁箣鐩熺殑姝ｇ‘璇勪环鏄?, options: ['瀹屽叏灞堣颈鐨勫煄涓嬩箣鐩?, '甯︽潵浜嗗畫杈介暱鏈熷拰骞炽€佷績杩涗簡杈瑰璐告槗', '浣胯窘瀹屽叏鐏骸', '浣垮畫寰佹湇浜嗚窘'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃京璇佽瘎浠枫€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝婢舵笂涔嬬洘涓庡畫澶忓拰璁紝鍏卞悓鐐规槸', options: ['鍖楀畫閮芥垬鑳滃鏂?, '鍖楀畫閮界粰瀵规柟宀佸竵銆佹崲鍙栧拰骞?, '閮戒娇瀵规柟绉拌嚕', '閮藉彂鐢熷湪鍗楀畫'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽拰璁瘮杈冦€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級杈藉畫澶忓苟绔嬪眬闈㈠弽鏄犲嚭杩欎竴鏃舵湡鐨勬椂浠ｇ壒寰佹槸', options: ['缁熶竴澶氭皯鏃忓浗瀹跺畬鍏ㄥ珐鍥?, '姘戞棌鏀挎潈骞剁珛銆佹皯鏃忎氦铻嶅姞寮?, '鍥藉鍒嗚鍊掗€€', '涓浜ゆ祦鏂粷'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾椂浠ｇ壒寰併€? },
    ],
  },

  {
    id: 'g-his-7b-10', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 杈藉畫澶忛噾鍏冩椂鏈燂細姘戞棌鍏崇郴鍙戝睍鍜岀ぞ浼氬彉鍖?, edition: '缁熺紪鐗?, section: '绗?0璇?閲戜笌鍗楀畫瀵瑰硻',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '閲戠伃杈戒笌鍖楀畫', content: '1115骞撮樋楠ㄦ墦寤洪噾锛?127骞撮潠搴蜂箣鍙樸€? },
      { id: 'kp2', title: '鍗楀畫寤虹珛涓庡渤椋炴姉閲?, content: '1127骞磋档鏋勫缓鍗楀畫锛屽渤椋為兙鍩庡ぇ鎹枫€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1115骞达紝姝ｅ紡寤虹珛濂崇湡鏀挎潈銆佸浗鍙峰ぇ閲戠殑鏄?, options: ['闃夸繚鏈?, '鍏冩槉', '闃块鎵?, '閾佹湪鐪?], answerIndex: 2, explanation: '绠€鍗曪細瀹岄闃块鎵撱€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '1127骞达紝閲戞敾鐮村寳瀹嬮兘鍩庛€佺伃浜″寳瀹嬬殑浜嬩欢鍙茬О', options: ['闄堟ˉ鍏靛彉', '闈栧悍涔嬪彉', '婢舵笂涔嬬洘', '鍦熸湪鍫′箣鍙?], answerIndex: 1, explanation: '绠€鍗曪細闈栧悍涔嬪彉銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍗楀畫鐨勫缓绔嬭€呮槸', options: ['璧靛尅鑳?, '璧垫瀯', '璧靛厜涔?, '璧垫亽'], answerIndex: 1, explanation: '绠€鍗曪細瀹嬮珮瀹楄档鏋勩€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '宀抽鐜囧渤瀹跺啗澶ц触閲戝啗涓诲姏鐨勬垬褰规槸', options: ['閮惧煄澶ф嵎', '婢跺窞涔嬫垬', '璧ゅ涔嬫垬', '瀹樻浮涔嬫垬'], answerIndex: 0, explanation: '涓瓑锛氶兙鍩庡ぇ鎹枫€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '瀹嬮珮瀹楀拰绉︽¨涓嬩护鍙洖宀抽銆佷互"鑾』鏈?缃悕鏉€瀹充粬锛屾槸鍥犱负浠栦滑瀹虫€?, options: ['宀抽鍔熼珮闇囦富銆佹姉閲戣儨鍒╁悗杩庡洖寰介挦浜屽笣', '閲戝啗鍙嶆墤', '鐧惧璧蜂箟', '钘╅晣鍓叉嵁'], answerIndex: 0, explanation: '涓瓑锛氭姇闄嶆淳闄峰銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '瀹嬮噾鍜岃瑙勫畾锛屽弻鏂瑰垎鐣岀嚎涓?, options: ['榛勬渤涓€绾?, '娣按鑷冲ぇ鏁ｅ叧涓€绾?, '闀挎睙涓€绾?, '绉﹀箔涓€绾?], answerIndex: 1, explanation: '涓瓑锛氱粛鍏村拰璁€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?闈栧悍鑰伙紝鐘规湭闆€傝嚕瀛愭仺锛屼綍鏃剁伃锛?杩欏彞璇嶇殑浣滆€呮槸', options: ['鑻忚郊', '宀抽', '杈涘純鐤?, '闄嗘父'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屻€婃弧姹熺孩銆嬨€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級閲戠伃杈藉拰鍖楀畫鐨勯『搴忔槸', options: ['鍏堢伃鍖楀畫鍐嶇伃杈?, '鍏堢伃杈藉啀鐏寳瀹?, '鍚屾椂鐏骸', '閲戣杈藉畫鑱斿悎鎵€鐏?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾斂鏉冩洿鏇裤€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝宀抽鎶楅噾涓庢枃澶╃ゥ鎶楀厓锛屽叡鍚岀偣鏄?, options: ['閮藉彇寰楁渶缁堣儨鍒?, '閮藉弽鎶楁皯鏃忓帇杩€佸叿鏈夋涔夋€?, '閮借鐨囧笣閲嶇敤', '閮藉彂鐢熷湪鍖楀畫'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾姉閲戞姉鍏冦€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缁嶅叴鍜岃甯︽潵鐨勫奖鍝嶆槸', options: ['娑堢伃浜嗛噾', '褰㈡垚浜嗗畫閲戝崡鍖楀宄欏眬闈?, '浣垮崡瀹嬬粺涓€鍏ㄥ浗', '浣块噾鍚戝崡瀹嬬О鑷?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽宄欏舰鎴愩€? },
    ],
  },

  {
    id: 'g-his-7b-11', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 杈藉畫澶忛噾鍏冩椂鏈燂細姘戞棌鍏崇郴鍙戝睍鍜岀ぞ浼氬彉鍖?, edition: '缁熺紪鐗?, section: '绗?1璇?鍏冩湞鐨勫缓绔嬩笌缁熶竴',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '钂欏彜鍏磋捣涓庡厓鏈濆缓绔?, content: '1206骞撮搧鏈ㄧ湡缁熶竴钂欏彜锛?271骞村拷蹇呯儓寤哄厓銆? },
      { id: 'kp2', title: '琛岀渷鍒跺害', content: '涓ぎ璁句腑涔︾渷锛屽湴鏂硅琛屼腑涔︾渷銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '缁熶竴钂欏彜鍚勯儴銆佸缓绔嬭挋鍙ゆ斂鏉冪殑鏄?, options: ['闃块鎵?, '閾佹湪鐪燂紙鎴愬悏鎬濇睏锛?, '蹇藉繀鐑?, '闃夸繚鏈?], answerIndex: 1, explanation: '绠€鍗曪細1206骞存垚鍚夋€濇睏銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '1271骞达紝鏀瑰浗鍙蜂负鍏冦€佹骞村畾閮藉ぇ閮界殑鏄?, options: ['閾佹湪鐪?, '蹇藉繀鐑?, '钂欏摜', '鎷栭浄'], answerIndex: 1, explanation: '绠€鍗曪細鍏冧笘绁栧拷蹇呯儓銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鍏冨啗鐏骸鍗楀畫銆佸畬鎴愬叏鍥界粺涓€鏄湪', options: ['1227骞?, '1234骞?, '1276骞?, '1279骞?], answerIndex: 3, explanation: '绠€鍗曪細1279骞寸粺涓€銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍏冩湞涓ぎ鏈€楂樿鏀挎満鏋勬槸', options: ['涓功鐪?, '闂ㄤ笅鐪?, '灏氫功鐪?, '琛屼腑涔︾渷'], answerIndex: 0, explanation: '涓瓑锛氫腑涔︾渷銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍏冩湞鍦ㄥ湴鏂硅绔嬬殑琛屾斂鏈烘瀯鏄?, options: ['閮″幙', '琛岀渷', '鑺傚害浣?, '宸炵墽'], answerIndex: 1, explanation: '涓瓑锛氳鐪佸埗搴︺€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鎶楀厓琚繕銆佸啓涓?浜虹敓鑷彜璋佹棤姝伙紝鐣欏彇涓瑰績鐓ф睏闈?鐨勬槸', options: ['宀抽', '鏂囧ぉ绁?, '闄嗙澶?, '寮犱笘鏉?], answerIndex: 1, explanation: '涓瓑锛氭枃澶╃ゥ銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?鍏冩湞鐤嗗煙鍖楅€鹃槾灞憋紝瑗挎瀬娴佹矙锛屼笢灏借窘宸︼紝鍗楄秺娴疯〃鈥︹€︾珛涓功鐪佷竴锛岃涓功鐪佸崄鏈変竴銆?杩欐鏉愭枡鎻忚堪鐨勬槸', options: ['涓夌渷鍏儴鍒?, '琛岀渷鍒跺害', '閮″幙鍒跺害', '鍒嗗皝鍒跺害'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃鐪佸埗銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍏冩湞缁熶竴鐨勫巻鍙叉剰涔夋槸', options: ['瀹屾垚浜嗗叏鍥藉ぇ涓€缁熴€佷績杩涗簡姘戞棌浜よ瀺', '浣胯挋鍙ゅ垎瑁?, '瀵艰嚧浜嗗崡瀹嬬伃浜?, '鍓婂急浜嗕腑澶泦鏉?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粺涓€鎰忎箟銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝绉︽湞閮″幙鍒朵笌鍏冩湞琛岀渷鍒讹紝鍏卞悓鐐规槸', options: ['閮芥槸鍦版柟琛屾斂鍒跺害銆佸姞寮轰簡涓ぎ闆嗘潈', '閮藉垎灏佽渚?, '閮藉疄琛岄儴钀藉埗', '閮界敱灏戞暟姘戞棌鍒涚珛'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽湴鏂硅鏀裤€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級瑗胯棌姝ｅ紡褰掑睘涓ぎ鏀垮簻绠¤緰濮嬩簬', options: ['鍞愭湞', '鍏冩湞璁惧鏀块櫌', '鏄庢湞', '娓呮湞'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃竟鐤嗙杈栥€? },
    ],
  },

  {
    id: 'g-his-7b-12', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 杈藉畫澶忛噾鍏冩椂鏈燂細姘戞棌鍏崇郴鍙戝睍鍜岀ぞ浼氬彉鍖?, edition: '缁熺紪鐗?, section: '绗?2璇?杈藉畫澶忛噾鍏冩椂鏈熺粡娴庣殑绻佽崳',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍐滀笟涓庢墜宸ヤ笟', content: '姘寸ɑ鍗犲煄绋伙紝鏅痉闀囩摲閮斤紝妫夌汉缁囦笟銆? },
      { id: 'kp2', title: '鍟嗕笟涓庢捣澶栬锤鏄?, content: '浜ゅ瓙锛堝寳瀹嬪洓宸濓級锛屽競鑸跺徃锛屼复瀹夊ぇ閮姐€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍖楀畫鏃讹紝浠庤秺鍗楀紩杩涚殑浼樿壇姘寸ɑ鍝佺鏄?, options: ['鍗犲煄绋?, '绫肩ɑ', '绮崇ɑ', '绯ɑ'], answerIndex: 0, explanation: '绠€鍗曪細鍗犲煄绋汇€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍖楀畫鍏磋捣銆佸悗鏉ュ彂灞曟垚钁楀悕鐡烽兘鐨勬槸', options: ['鍝ョ獞', '鏅痉闀?, '瀹氱獞', '閽х獞'], answerIndex: 1, explanation: '绠€鍗曪細鏅痉闀囥€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓栫晫涓婃渶鏃╃殑绾稿竵鏄?, options: ['浼氬瓙', '浜ゅ瓙', '鍏冲瓙', '閾剁エ'], answerIndex: 1, explanation: '绠€鍗曪細鍖楀畫鍥涘窛浜ゅ瓙銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍖楀畫鍓嶆湡锛屼氦瀛愬嚭鐜颁簬鍝竴鍦板尯', options: ['姹熸禉', '鍥涘窛鍦板尯', '涓ゅ箍', '涓師'], answerIndex: 1, explanation: '涓瓑锛氬洓宸濆湴鍖恒€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '瀹嬫湞绠＄悊娴峰璐告槗鐨勬満鏋勬槸', options: ['甯傝埗鍙?, '娴峰叧', '甯冩斂鍙?, '瀹ｆ斂闄?], answerIndex: 0, explanation: '涓瓑锛氬競鑸跺徃銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍗楀畫鏃讹紝鏈€澶х殑鍟嗕笟閮藉競鏄?, options: ['寮€灏?, '涓村畨', '骞垮窞', '娉夊窞'], answerIndex: 1, explanation: '涓瓑锛氫复瀹夊嵆鏉窞銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?铚€鍦扳€︹€﹂搧閽变綋閲嶅€煎皬锛屼拱鍗栦氦鏄撶敤閽辩箒鈥︹€﹀閫犱氦瀛愩€?杩欐鏉愭枡璇存槑浜ゅ瓙鍑虹幇鐨勪富瑕佸師鍥犳槸', options: ['閲戝睘璐у竵鎼哄甫涓嶄究', '瀹嬫湞绾稿竵鍗板埛鏈厛杩?, '澶栧浗瑕佹眰', '鏀垮簻寮哄埗鍙戣'], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀焊甯佸師鍥犮€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級瀹嬫湞缁忔祹鍙戝睍鐨勭獊鍑鸿〃鐜版槸', options: ['缁忔祹閲嶅績鍗楃Щ瀹屾垚', '鍑虹幇璧勬湰涓讳箟钀岃娊', '閲嶅伐涓氶鍏堜笘鐣?, '寮€濮嬩娇鐢ㄩ搧鍣?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粡娴庡崡绉汇€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍞愭湞闀垮畨涓庡寳瀹嬩笢浜晢涓氾紝瀹嬩唬涓滀含鏂板湪浜?, options: ['鍧婂競涓ユ牸鍒嗙', '鎵撶牬鍧婂競鐣岄檺銆佸嚭鐜版棭甯傚甯?, '娌℃湁鍟嗕笟', '鍙湁瀹樺簻浜ゆ槗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽晢涓氶潻鍛姐€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缁忔祹閲嶅績鍗楃Щ鏈€缁堝畬鎴愪簬', options: ['鍞愭湞涓湡', '鍗楀畫', '鍖楀畫', '鍏冩湞'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽崡绉诲畬鎴愩€? },
    ],
  },

  {
    id: 'g-his-7b-13', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 杈藉畫澶忛噾鍏冩椂鏈燂細姘戞棌鍏崇郴鍙戝睍鍜岀ぞ浼氬彉鍖?, edition: '缁熺紪鐗?, section: '绗?3璇?杈藉畫澶忛噾鍏冩椂鏈熺殑瀵瑰浜ゆ祦',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?3璇? },
    knowledgePoints: [
      { id: 'kp1', title: '娉夊窞涓庢捣澶栬锤鏄?, content: '娉夊窞鏄笘鐣岀涓€澶ф腐锛屽競鑸跺徃銆? },
      { id: 'kp2', title: '椹彲路娉㈢綏鏉ュ崕', content: '鍏冩湞鏃堕┈鍙锋尝缃楁潵鍗庯紝钁椼€婇┈鍙锋尝缃楄绾€嬨€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍏冩湞鏃讹紝琚獕涓?涓栫晫绗竴澶ф腐"鐨勬槸', options: ['骞垮窞', '娉夊窞', '鏄庡窞', '鏉窞'], answerIndex: 1, explanation: '绠€鍗曪細娉夊窞銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '瀹嬩唬鏈夊悕鐨勫ぇ鍟嗘腐涓嶅寘鎷?, options: ['骞垮窞', '娉夊窞', '涓村畨', '澶ц繛'], answerIndex: 3, explanation: '绠€鍗曪細娴峰璐告槗娓€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍏冩湞鏃讹紝鏉ュ埌涓浗銆佸湪鏈濆环鍋氬畼17骞寸殑鎰忓ぇ鍒╂梾琛屽鏄?, options: ['鍒╃帥绐?, '椹彲路娉㈢綏', '姹よ嫢鏈?, '閮庝笘瀹?], answerIndex: 1, explanation: '绠€鍗曪細椹彲路娉㈢綏銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '璁拌堪椹彲路娉㈢綏涓滄柟瑙侀椈銆佹縺璧锋娲蹭汉瀵逛笢鏂瑰悜寰€鐨勪功鏄?, options: ['銆婂ぇ鍞愯タ鍩熻銆?, '銆婇┈鍙锋尝缃楄绾€?, '銆婂緪闇炲娓歌銆?, '銆婄€涙动鑳滆銆?], answerIndex: 1, explanation: '涓瓑锛氥€婇┈鍙锋尝缃楄绾€嬨€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '瀹嬫湞鏀垮簻榧撳姳娴峰璐告槗锛屽湪涓昏娓彛璁剧珛', options: ['甯傝埗鍙?, '娴峰叧鎬荤讲', '甯冩斂浣垮徃', '宸℃鍙?], answerIndex: 0, explanation: '涓瓑锛氬競鑸跺徃銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '椹彲路娉㈢綏鏉ュ崕鏃跺湪浣嶇殑鐨囧笣鏄?, options: ['鎴愬悏鎬濇睏', '蹇藉繀鐑?, '钂欏摜', '鍏冩垚瀹?], answerIndex: 1, explanation: '涓瓑锛氬厓涓栫銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?杩欎綅濞佸凹鏂晢浜哄湪涓浗鐢熸椿浜?7骞达紝鏇惧澶ф睏涔嬪懡宸¤鍚勫湴锛屼粬鐨勬父璁板悜娆ф床灞曠ず浜嗗瘜搴剁殑涓滄柟銆?浠栨槸', options: ['鍒╃帥绐?, '椹彲路娉㈢綏', '鍗楁€€浠?, '鑹惧剴鐣?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽垽鏂汉鐗┿€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級瀹嬩唬娴峰璐告槗鍙戣揪鐨勫師鍥犱笉鍖呮嫭', options: ['閫犺埞涓氬彂杈俱€佽埅娴锋妧鏈厛杩?, '鏀垮簻榧撳姳娴峰璐告槗', '缁忔祹閲嶅績鍗楃Щ', '闂叧閿佸浗鏀跨瓥'], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃锤鏄撳師鍥犮€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍞愭湞鐜勫瑗胯涓庡厓鏈濋┈鍙锋尝缃楁潵鍗庯紝鍏卞悓鐐规槸', options: ['閮戒粠涓浗鍒板嵃搴?, '閮戒績杩涗簡涓滆タ鏂规枃鍖栦氦娴?, '閮芥槸鍍т汉', '閮借蛋娴疯矾'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽澶栦氦娴併€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級娉夊窞鎴愪负涓栫晫绗竴澶ф腐鐨勬牴鏈師鍥犳槸', options: ['鏀垮簻澶у姏鎵舵寔', '瀹嬪厓鏃舵湡缁忔祹绻佽崳銆佹捣澶栬锤鏄撳彂杈?, '鍦扮悊浣嶇疆浼樿秺', '褰撳湴浜哄彛浼楀'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾腐鍙ｅ叴鐩涖€? },
    ],
  },

  {
    id: 'g-his-7b-14', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 杈藉畫澶忛噾鍏冩椂鏈燂細姘戞棌鍏崇郴鍙戝睍鍜岀ぞ浼氬彉鍖?, edition: '缁熺紪鐗?, section: '绗?4璇?杈藉畫澶忛噾鍏冩椂鏈熺殑绉戞妧涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?4璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓夊ぇ鍙戞槑', content: '姣曟槆娲诲瓧鍗板埛鏈€佹寚鍗楅拡銆佺伀鑽€? },
      { id: 'kp2', title: '鍙插涓庢枃瀛?, content: '鍙搁┈鍏夈€婅祫娌婚€氶壌銆嬶紝瀹嬭瘝鍏冩洸銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍙戞槑娲诲瓧鍗板埛鏈殑鏄?, options: ['钄′鸡', '姣曟槆', '娌堟嫭', '閮畧鏁?], answerIndex: 1, explanation: '绠€鍗曪細鍖楀畫姣曟槆銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鎸囧崡閽堝紑濮嬬敤浜庤埅娴锋槸鍦?, options: ['鍞愭湞', '鍖楀畫', '鍗楀畫', '鍏冩湞'], answerIndex: 1, explanation: '绠€鍗曪細鍖楀畫銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鐏嵂姝﹀櫒骞挎硾鐢ㄤ簬鎴樹簤鏄湪', options: ['鍞愭湞鏈勾', '瀹嬪厓鏃舵湡', '鏄庢湞', '娓呮湞'], answerIndex: 1, explanation: '绠€鍗曪細瀹嬪厓銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍖楀畫鍙插瀹跺徃椹厜缂栧啓鐨勭紪骞翠綋閫氬彶宸ㄨ憲鏄?, options: ['銆婂彶璁般€?, '銆婅祫娌婚€氶壌銆?, '銆婃眽涔︺€?, '銆婂悗姹変功銆?], answerIndex: 1, explanation: '涓瓑锛氥€婅祫娌婚€氶壌銆嬨€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '銆婅祫娌婚€氶壌銆嬭杩扮殑鍘嗗彶鏃舵湡鏄?, options: ['浠庨粍甯濆埌姹夋甯?, '浠庢垬鍥藉埌浜斾唬', '浠庡鍟嗗埌闅嬪攼', '浠庡厛绉﹀埌鍖楀畫'], answerIndex: 1, explanation: '涓瓑锛?362骞撮€氬彶銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '瀹嬩唬涓昏鐨勬枃瀛﹀舰寮忔槸', options: ['璇?, '璇?, '鏇?, '灏忚'], answerIndex: 1, explanation: '涓瓑锛氬畫璇嶃€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?鑸熷笀璇嗗湴鐞嗭紝澶滃垯瑙傛槦锛屾樇鍒欒鏃ワ紝闃存櫐鍒欒鎸囧崡閽堛€?杩欒鏄庢寚鍗楅拡', options: ['寮€濮嬬敤浜庡崰鍗?, '宸茬粡鐢ㄤ簬鑸捣杈ㄥ埆鏂瑰悜', '鐢ㄤ簬椋庢按', '鐢ㄤ簬鍐涗簨'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾寚鍗楅拡搴旂敤銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級娲诲瓧鍗板埛鏈彂鏄庣殑鎰忎箟鏄?, options: ['鎻愰珮浜嗗嵃鍒锋晥鐜囥€佷績杩涗簡鏂囧寲浼犳挱', '鍙栦唬浜嗛€犵焊鏈?, '浣挎枃瀛楀紑濮嬪嚭鐜?, '浣跨涓惧埗搴熼櫎'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀鎶€褰卞搷銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝銆婂彶璁般€嬩笌銆婅祫娌婚€氶壌銆嬶紝姝ｇ‘鐨勬槸', options: ['閮芥槸绾紶浣?, '銆婂彶璁般€嬬邯浼犱綋銆併€婅祫娌婚€氶壌銆嬬紪骞翠綋', '閮芥槸閫氬彶浣嗕綔鑰呯浉鍚?, '閮借杩板埌瀹嬫湞'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彶瀛﹀弻鐠с€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓夊ぇ鍙戞槑瀵逛笘鐣屾枃鏄庣殑璐＄尞鏄?, options: ['浣夸腑鍥芥垚涓轰笘鐣岄湼涓?, '淇冭繘浜嗘娲蹭粠灏佸缓绀句細鍚戣祫鏈富涔夌ぞ浼氳繃娓?, '瀵艰嚧浜嗛棴鍏抽攣鍥?, '浣夸腑鍥界鎶€棰嗗厛鑷充粖'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笘鐣屽奖鍝嶃€? },
    ],
  },

  {
    id: 'g-his-7b-15', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?5璇?鏄庢湞鐨勭粺娌?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?5璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鏄庢湞寤虹珛', content: '1368骞存湵鍏冪拫寤烘槑锛屽畾閮藉簲澶╋紙鍗椾含锛夈€? },
      { id: 'kp2', title: '寮哄寲鐨囨潈涓庡叓鑲″彇澹?, content: '搴熶笧鐩搞€佽涓夊徃銆侀敠琛ｅ崼锛屽叓鑲℃枃銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鏄庢湞寤虹珛鐨勬椂闂村拰寤虹珛鑰呮槸', options: ['1368骞存湵鍏冪拫', '1368骞存湵妫?, '1380骞存湵鏍?, '1402骞存湵楂樼偨'], answerIndex: 0, explanation: '绠€鍗曪細1368骞存槑澶銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鏄庢湞鐨勯兘鍩庢渶鍒濆湪', options: ['鍖椾含', '搴斿ぉ锛堝崡浜級', '娲涢槼', '闀垮畨'], answerIndex: 1, explanation: '绠€鍗曪細瀹氶兘鍗椾含銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏄庡お绁栦负鍔犲己鐨囨潈锛屽簾闄ょ殑闀挎湡瀛樺湪鐨勫埗搴︽槸', options: ['涓夌渷鍒?, '涓炵浉鍒跺害', '绉戜妇鍒?, '琛岀渷鍒?], answerIndex: 1, explanation: '绠€鍗曪細搴熶笧鐩搞€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏄庡お绁栬绔嬬殑鐗瑰姟鏈烘瀯鏄?, options: ['涓滃巶', '閿﹁。鍗?, '瑗垮巶', '鍐呰鍘?], answerIndex: 1, explanation: '涓瓑锛氶敠琛ｅ崼銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鏄庢湞绉戜妇鑰冭瘯鐨勬枃浣撲弗鏍艰瀹氫负', options: ['璇楄祴', '鍏偂鏂?, '绛栬', '鏁ｆ枃'], answerIndex: 1, explanation: '涓瓑锛氬叓鑲″彇澹€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍏偂鍙栧＋鐨勮€冭瘯鍛介鑼冨洿鏄?, options: ['璇稿瓙鐧惧', '"鍥涗功""浜旂粡"', '鍘嗕唬姝ｅ彶', '鏃跺姟绛栬'], answerIndex: 1, explanation: '涓瓑锛氬剴瀹剁粡鍏搞€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?鍏偂涔嬪绛変簬鐒氫功锛岃€岃触鍧忎汉鎵嶆湁鐢氫簬鍜搁槼涔嬮儕鎵€鍧戣€呫€?杩欓噷鎵硅瘎鐨勬槸', options: ['绉︽湞鐒氫功鍧戝剴', '鏄庢湞鍏偂鍙栧＋', '姹夋湞缃㈤粶鐧惧', '娓呮湞鏂囧瓧鐙?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽叓鑲″嵄瀹炽€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏄庡お绁栧己鍖栫殗鏉冪殑鎺柦涓嶅寘鎷?, options: ['搴熶笧鐩搞€佹潈鍒嗗叚閮?, '鍦版柟璁句笁鍙?, '璁鹃敠琛ｅ崼', '璁惧啗鏈哄'], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀殗鏉冨己鍖栥€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏄庢湞鍏偂鍙栧＋涓庡攼鏈濈涓惧埗锛屾槑鏈?, options: ['鑰冭瘯褰㈠紡鏇寸伒娲?, '鑰冭瘯鍐呭鍜屾枃浣撲弗鏍煎兊鍖栥€佺閿㈡€濇兂', '鏇撮噸瑙嗚瘲璧?, '鏇撮紦鍔辨€濇兂鍒涙柊'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀涓炬紨鍙樸€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏄庢湞寤虹珛鐨勫巻鍙叉剰涔夋槸', options: ['鐏骸浜嗗厓鏈濄€佹仮澶嶄簡姹夋棌鏀挎潈', '瀹炵幇浜嗗叏鍥藉ぇ涓€缁?, '缁撴潫浜嗘槬绉嬫垬鍥藉垎瑁?, '纭珛浜嗗唴闃佸埗搴?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽紑鍥芥剰涔夈€? },
    ],
  },

  {
    id: 'g-his-7b-16', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?6璇?鏄庢湞鐨勫澶栧叧绯?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?6璇? },
    knowledgePoints: [
      { id: 'kp1', title: '閮戝拰涓嬭タ娲?, content: '1405-1433骞翠竷涓嬭タ娲嬶紝鏈€杩滃埌闈炴床涓滄捣宀搞€? },
      { id: 'kp2', title: '鎴氱户鍏夋姉鍊笌钁″崰婢抽棬', content: '鎴氱户鍏夊钩瀹氬€偅锛?553骞磋憽鍗犳境闂ㄣ€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '閮戝拰绗竴娆′笅瑗挎磱鐨勬椂闂存槸', options: ['1405骞?, '1421骞?, '1433骞?, '1402骞?], answerIndex: 0, explanation: '绠€鍗曪細1405骞淬€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '閮戝拰涓嬭タ娲嬫椂鍦ㄤ綅鐨勭殗甯濇槸', options: ['鏄庡お绁?, '鏄庢垚绁?, '鏄庝粊瀹?, '鏄庡瀹?], answerIndex: 1, explanation: '绠€鍗曪細鏄庢垚绁栨湵妫ｃ€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '閮戝拰鑸归槦鏈€杩滃埌杈?, options: ['娆ф床瑗挎捣宀?, '闈炴床涓滄捣宀稿拰绾㈡捣娌垮哺', '缇庢床涓滄捣宀?, '婢虫床澶ч檰'], answerIndex: 1, explanation: '绠€鍗曪細绾㈡捣娌垮哺銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏄庢湞涓湡锛屽钩瀹氫笢鍗楁部娴峰€偅鐨勬皯鏃忚嫳闆勬槸', options: ['宀抽', '鎴氱户鍏?, '鏂囧ぉ绁?, '閮戞垚鍔?], answerIndex: 1, explanation: '涓瓑锛氭垰缁у厜銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1553骞达紝鏀彇鍦ㄦ垜鍥芥境闂ㄥ眳浣忔潈鐨勬槸', options: ['瑗跨彮鐗欐畺姘戣€?, '钁¤悇鐗欐畺姘戣€?, '鑽峰叞娈栨皯鑰?, '鑻卞浗娈栨皯鑰?], answerIndex: 1, explanation: '涓瓑锛氳憽钀勭墮銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '閮戝拰涓嬭タ娲嬬殑鐩殑鏄?, options: ['娈栨皯鎵╁紶', '鎻愰珮鏄庢湞鍦ㄥ浗澶栫殑鍦颁綅鍜屽▉鏈涖€佺ず涓浗瀵屽己', '鎺犲ず榛勯噾鐧介摱', '寮€杈熷埌缇庢床鐨勬柊鑸矾'], answerIndex: 1, explanation: '涓瓑锛氬鎵浗濞併€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?鑷案涔愪笁骞村浣胯タ娲嬶紝杩ㄤ粖涓冩锛屾墍鍘嗙暘鍥解€︹€︿笁鍗佷綑鍥斤紝娑夋钵婧熷崄涓囦綑閲屻€?杩欐鏉愭枡璁拌堪鐨勬槸', options: ['閴寸湡涓滄浮', '閮戝拰涓嬭タ娲?, '鐜勫瑗胯', '椹彲路娉㈢綏鏉ュ崕'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽垽鏂簨浠躲€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級閮戝拰涓嬭タ娲嬬殑鍘嗗彶鎰忎箟鏄?, options: ['鍔犲己浜嗕腑鍥戒笌浜氶潪鍚勫浗鍙嬪ソ寰€鏉ュ拰缁忔祹浜ゆ祦', '浣夸腑鍥藉緛鏈嶄簡浜氶潪鍚勫浗', '寮€杈熶簡鍒扮編娲茬殑鏂拌埅绾?, '浣挎槑鏈濊蛋鍚戦棴鍏抽攣鍥?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繙鑸剰涔夈€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鎴氱户鍏夋姉鍊笌閮戞垚鍔熸敹澶嶅彴婀撅紝鍏卞悓鐐规槸', options: ['閮藉彂鐢熷湪鏄庢湞涓悗鏈?, '閮芥槸鍙嶆姉澶栨潵渚电暐鐨勬涔夋枟浜?, '閮界敱鐨囧笣寰￠┚浜插緛', '閮借儨鍒╁悗鏀跺浜嗘境闂?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽弽渚电暐銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級閮戝拰涓嬭タ娲嬫瘮娆ф床杩滄磱鑸鏃╃害', options: ['鍗婁釜涓栫邯', '鍗婁釜澶氫笘绾?, '涓€涓笘绾?, '涓ょ櫨骞?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾椂闂存瘮杈冦€? },
    ],
  },

  {
    id: 'g-his-7b-17', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?7璇?鏄庢湞鐨勭伃浜″拰娓呮湞鐨勫缓绔?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?7璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鏄庢湯鍐滄皯璧蜂箟', content: '鏉庤嚜鎴愯捣涔夛紝1644骞存敾鍗犲寳浜紝鏄庝骸銆? },
      { id: 'kp2', title: '娓呮湞寤虹珛涓庡叆鍏?, content: '1616骞村悗閲戯紝1636骞存敼鍥藉彿娓咃紝1644骞村叆鍏炽€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1644骞达紝鐜囧啗鏀诲崰鍖椾含銆佹帹缈绘槑鏈濈殑鏄?, options: ['寮犵尞蹇?, '鏉庤嚜鎴?, '鍚翠笁妗?, '鍔皵鍝堣丹'], answerIndex: 1, explanation: '绠€鍗曪細鏉庤嚜鎴愩€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '1616骞达紝缁熶竴濂崇湡鍚勯儴銆佸缓绔嬪悗閲戠殑鏄?, options: ['鐨囧お鏋?, '鍔皵鍝堣丹', '澶氬皵琛?, '椤烘不甯?], answerIndex: 1, explanation: '绠€鍗曪細鍔皵鍝堣丹銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏀瑰浗鍙蜂负娓呯殑鏄?, options: ['鍔皵鍝堣丹', '鐨囧お鏋?, '椤烘不甯?, '搴风啓甯?], answerIndex: 1, explanation: '绠€鍗曪細鐨囧お鏋併€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '娓呭啗鍏ュ叧銆佸紑濮嬬粺娌诲叏鍥芥槸鍦?, options: ['1636骞?, '1644骞?, '1662骞?, '1683骞?], answerIndex: 1, explanation: '涓瓑锛?644骞淬€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鏉庤嚜鎴愯捣涔夊啗鎻愬嚭鐨勫彛鍙锋槸', options: ['鍧囪传瀵?, '鍧囩敯鍏嶈祴', '绛夎吹璐?, '浼愭棤閬?], answerIndex: 1, explanation: '涓瓑锛氬潎鐢板厤璧嬨€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鏄庢湞鐏骸鐨勭洿鎺ュ師鍥犳槸', options: ['鍚庨噾鍏ヤ镜', '鏉庤嚜鎴愬啘姘戣捣涔夊啗鏀诲崰鍖椾含', '鍚翠笁妗傚紩娓呭啗鍏ュ叧', '澶栨棌澶ц妯″叆渚?], answerIndex: 1, explanation: '涓瓑锛氬啘姘戣捣涔夈€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?1644骞?鏈堬紝鐧句竾澶у啗鍦ㄦ潕鑷垚鎸囨尌涓嬶紝瀵瑰寳浜煄鍙戣捣鐚涚儓杩涙敾锛屼笉鍒颁袱澶╁氨鏀昏繘鍩庡唴锛屾槑鏈濇湯甯濆磭绁嚜缂€?璇ヤ簨浠?, options: ['鏍囧織娓呮湞姝ｅ紡寤虹珛', '鏍囧織鏄庢湞鐏骸', '鏍囧織娓呭啗鍏ュ叧', '鏍囧織杈涗亥闈╁懡鐖嗗彂'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾槑浜°€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏄庢湯鍐滄皯璧蜂箟鐖嗗彂鐨勬牴鏈師鍥犳槸', options: ['鏄庢湯鏀挎不鑵愯触銆佸湡鍦板吋骞朵弗閲?, '鍚庨噾鍐涗簨濞佽儊', '澶栨棌鍏ヤ镜', '杩炲勾澶╃伨'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃捣涔夊師鍥犮€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝娓呭啗鍏ュ叧涓庤挋鍙ゅ崡涓嬶紝鍏卞悓鐐规槸', options: ['閮芥槸灏戞暟姘戞棌鍏ヤ富涓師', '閮戒粠涓滃寳鍏磋捣', '閮藉缓绔嬩簡鍏ㄥ浗缁熶竴鏀挎潈', '閮界珛鍗虫帹琛屾眽鍖?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽皯鏁版皯鏃忔斂鏉冦€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏉庤嚜鎴愯捣涔?鍧囩敯鍏嶈祴"鍙ｅ彿鍙嶆槧浜?, options: ['鍐滄皯瑕佹眰鑾峰緱鍦熷湴銆佸弽瀵硅祴绋庡墺鍓?, '鍐滄皯瑕佹眰缁濆骞冲潎涓讳箟', '鍐滄皯瑕佹眰鍙戝睍璧勬湰涓讳箟', '鍐滄皯瑕佹眰鎭㈠浜曠敯鍒?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彛鍙锋剰涔夈€? },
    ],
  },

  {
    id: 'g-his-7b-18', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?8璇?娓呮湞鐨勮竟鐤嗘不鐞?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?8璇? },
    knowledgePoints: [
      { id: 'kp1', title: '瀵硅タ钘忕杈?, content: '椤烘不鍐屽皝杈捐禆銆佸悍鐔欏唽灏佺彮绂咃紝璁鹃┗钘忓ぇ鑷ｃ€? },
      { id: 'kp2', title: '瀵规柊鐤嗙杈栦笌鍙版咕', content: '骞冲畾澶у皬鍜屽崜锛岃浼婄妬灏嗗啗锛?684骞磋鍙版咕搴溿€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '椤烘不甯濇寮忚祼浜堣タ钘忎經鏁欓棰?杈捐禆鍠囧槢"灏佸彿锛屽悍鐔欏笣鍙堣祼浜堝彟涓€浣嶈タ钘忎經鏁欓棰嗗皝鍙凤紝璇ュ皝鍙锋槸', options: ['鐝棰濆皵寰峰凹', '璧炴櫘', '澶ф睏', '鍦熷徃'], answerIndex: 0, explanation: '绠€鍗曪細鐝棰濆皵寰峰凹銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '1727骞达紙闆嶆鏃讹級锛屾竻鏈濆紑濮嬭缃摢涓€鏈烘瀯鐩戠潱瑗胯棌鍦版柟鏀垮姟', options: ['瑗垮煙閮芥姢', '椹昏棌澶ц嚕', '浼婄妬灏嗗啗', '婢庢箹宸℃鍙?], answerIndex: 1, explanation: '绠€鍗曪細椹昏棌澶ц嚕銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '1684骞达紝娓呮湞璁剧疆鐨勯毝灞炵寤虹渷鐨勬満鏋勬槸', options: ['鍙版咕鐪?, '鍙版咕搴?, '婢庢箹宸℃鍙?, '绂忓缓鐪?], answerIndex: 1, explanation: '绠€鍗曪細鍙版咕搴溿€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '搴风啓甯濈巼鍐涗袱娆＄粍缁囬泤鍏嬭惃鑷崼鍙嶅嚮鎴橈紝鎵撹触鐨勪镜鐣ヨ€呮槸', options: ['鑽峰叞娈栨皯鑰?, '娌欎縿渚电暐鍐?, '鑻卞浗渚电暐鍐?, '钁¤悇鐗欐畺姘戣€?], answerIndex: 1, explanation: '涓瓑锛氭矙淇勩€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1689骞达紝涓縿绛捐鐨勭涓€涓竟鐣屾潯绾︽槸', options: ['銆婂崡浜潯绾︺€?, '銆婂凹甯冩鏉＄害銆?, '銆婄懛鐝叉潯绾︺€?, '銆婂寳浜潯绾︺€?], answerIndex: 1, explanation: '涓瓑锛氥€婂凹甯冩鏉＄害銆嬨€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涔鹃殕甯濆钩瀹氬洖閮ㄥぇ灏忓拰鍗撳彌涔卞悗锛岃缃殑绠¤緰鏁翠釜鏂扮枂鍦板尯鐨勬満鏋勬槸', options: ['瑗垮煙閮芥姢', '浼婄妬灏嗗啗', '椹昏棌澶ц嚕', '瀹夎タ閮芥姢'], answerIndex: 1, explanation: '涓瓑锛氫紛鐘佸皢鍐涖€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?涓轰簡鐩戠潱瑗胯棌鍦版柟鏀垮姟锛?727骞达紝娓呮湞鍦ㄨタ钘忚缃┗钘忓ぇ鑷ｏ紝浠ｈ〃涓ぎ鏀垮簻涓庤揪璧栥€佺彮绂呭叡鍚岀鐞嗚タ钘忎簨鍔°€?杩欒鏄庢竻鏈?, options: ['瀹炶姘戞棌鍒嗗寲鏀跨瓥', '鍔犲己浜嗗瑗胯棌鐨勬湁鏁堢杈?, '鏀惧純浜嗗瑗胯棌绠¤緰', '鐢辫揪璧栧畬鍏ㄨ嚜娌?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾不钘忔斂绛栥€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級娓呮湞璁剧疆鍙版咕搴滅殑閲嶈鎰忎箟鏄?, options: ['浣垮彴婀炬垚涓虹嫭绔嬪浗瀹?, '鍔犲己浜嗕腑澶鍙版咕鐨勭杈栥€佸珐鍥轰簡涓滃崡娴烽槻', '浣垮彴婀惧壊璁╃粰鏃ユ湰', '浣垮彴婀句笌澶ч檰姘镐箙鍒嗙'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彴婀惧洖褰掋€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍞愭湞涓庢竻鏈濆瑗胯棌鐨勭杈栵紝娓呮湞鏂板湪浜?, options: ['鍙湁鍜屼翰', '璁剧珛椹昏棌澶ц嚕銆侀噾鐡舵帲绛剧瓑鍒跺害鍔犲己鐩存帴绠¤緰', '瀹屽叏鏀惧純绠¤緰', '鐢卞悙钑冨畬鍏ㄨ嚜娌?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾不鐞嗚タ钘忋€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級娓呮湞鍓嶆湡杈圭枂娌荤悊鐨勪富瑕佷綔鐢ㄦ槸', options: ['閫犳垚鍥藉闀挎湡鍒嗚', '宸╁浐浜嗙粺涓€澶氭皯鏃忓浗瀹躲€佸瀹氫簡鐜颁唬涓浗鐗堝浘鍩虹', '鍓婂急浜嗕腑澶泦鏉?, '瀵艰嚧浜嗛棴鍏抽攣鍥?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀枂鍩熷瀹氥€? },
    ],
  },

  {
    id: 'g-his-7b-19', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?9璇?娓呮湞鍚涗富涓撳埗鐨勫己鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?9璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍐涙満澶勪笌鏂囧瓧鐙?, content: '闆嶆璁惧啗鏈哄锛屽ぇ鍏存枃瀛楃嫳銆? },
      { id: 'kp2', title: '闂叧閿佸浗', content: '鍙紑鏀惧箍宸炰竴澶勯€氬晢锛岀敱骞垮窞鍗佷笁琛岀鐞嗐€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '娓呮湞鍚涗富涓撳埗杩涗竴姝ュ己鍖栫殑鏍囧織鏄?, options: ['璁剧珛鍐呴榿', '鍐涙満澶勭殑璁剧珛', '璁捐鏀跨帇澶ц嚕浼氳', '璁惧崡涔︽埧'], answerIndex: 1, explanation: '绠€鍗曪細鍐涙満澶勩€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍐涙満澶勮绔嬩簬', options: ['椤烘不甯濇椂', '搴风啓甯濇椂', '闆嶆甯濇椂', '涔鹃殕甯濇椂'], answerIndex: 2, explanation: '绠€鍗曪細闆嶆銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '娓呮湞缁熸不鑰呬负鍔犲己鎬濇兂鎺у埗鑰岄噰鍙栫殑鎺柦鏄?, options: ['鐒氫功鍧戝剴', '缃㈤粶鐧惧', '澶у叴鏂囧瓧鐙?, '鍒涚珛绉戜妇'], answerIndex: 2, explanation: '绠€鍗曪細鏂囧瓧鐙便€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '娓呮湞缁熶竴鍙版咕鍚庯紝寮€鏀剧殑鍥涗釜瀵瑰閫氬晢娓彛涓嶅寘鎷?, options: ['骞垮窞', '婕冲窞', '瀹佹尝', '涓婃捣'], answerIndex: 3, explanation: '涓瓑锛氬洓澶ф腐鍙ｃ€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1757骞达紝娓呮斂搴滀笅浠ゅ彧寮€鏀句竴澶勪綔涓哄澶栭€氬晢鍙ｅ哺锛岃鍙ｅ哺鏄?, options: ['婕冲窞', '瀹佹尝', '骞垮窞', '浜戝彴灞?], answerIndex: 2, explanation: '涓瓑锛氬箍宸炰竴鍙ｉ€氬晢銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '娓呮湞缁熶竴缁忚惀绠＄悊瀵瑰璐告槗鐨勬満鏋勬槸', options: ['甯傝埗鍙?, '骞垮窞鍗佷笁琛?, '瀹ｆ斂闄?, '鍐涙満澶?], answerIndex: 1, explanation: '涓瓑锛氬崄涓夎銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?澶╂湞鐗╀骇涓扮泩锛屾棤鎵€涓嶆湁锛屽師涓嶈棄澶栧し璐х墿浠ラ€氭湁鏃犮€?姝よ瘽鍙嶆槧鐨勬斂绛栨槸', options: ['瀵瑰寮€鏀?, '闂叧閿佸浗', '閲嶅啘鎶戝晢', '娈栨皯鎵╁紶'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄棴鍏抽攣鍥姐€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍐涙満澶勮绔嬬殑褰卞搷鏄?, options: ['鎻愰珮浜嗗湴鏂硅鏀挎晥鐜?, '鏍囧織鐫€鎴戝浗灏佸缓鍚涗富闆嗘潈杩涗竴姝ュ己鍖?, '鎵╁ぇ浜嗗湴鏂规潈鍔?, '鍓婂急浜嗙殗鏉?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄《宄般€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闂叧閿佸浗鏀跨瓥鐨勪弗閲嶅悗鏋滄槸', options: ['淇濇姢浜嗘皯鏃忓伐涓?, '浣夸腑鍥介敊澶变簡鍚戣タ鏂瑰涔犲厛杩涚瀛︾煡璇嗗拰鐢熶骇鎶€鏈殑鏈轰細銆侀€愭笎钀戒紞', '淇冭繘浜嗘捣澶栬锤鏄撳彂灞?, '瀹屽叏鎶靛埗浜嗘畺姘戜镜鐣?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃惤鍚庢尐鎵撱€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝绉︽湞鐒氫功鍧戝剴銆佹槑鏈濆叓鑲″彇澹€佹竻鏈濇枃瀛楃嫳锛屽叡鍚岀偣鏄?, options: ['閮戒績杩涗簡鏂囧寲绻佽崳', '閮藉姞寮轰簡鎬濇兂鎺у埗銆佺閿簡鎬濇兂', '閮芥帹琛屾皯鏃忓垎鍖?, '閮芥帹鍔ㄤ簡绉戜妇鍙戝睍'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾€濇兂涓撳埗銆? },
    ],
  },

  {
    id: 'g-his-7b-20', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?0璇?鏄庢竻鏃舵湡绀句細缁忔祹鐨勫彂灞?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍐滀笟涓庢墜宸ヤ笟', content: '鐜夌背鐢樿柉浼犲叆锛岃嫃宸炴绾虹粐锛屾櫙寰烽晣闈掕姳鐡枫€? },
      { id: 'kp2', title: '鍟嗗搧缁忔祹涓庤祫鏈富涔夎悓鑺?, content: '鏅嬪晢寰藉晢锛屾槑鏈濅腑鍚庢湡鍑虹幇璧勬湰涓讳箟钀岃娊銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鏄庢湞涓悗鏈燂紝浠庡崡缇庢床寮曡繘鐨勯珮浜у啘浣滅墿鏄?, options: ['灏忛害鍜屾按绋?, '鐜夌背銆佺敇钖€侀┈閾冭柉', '绮熷拰榛?, '澶ц眴鍜岄珮绮?], answerIndex: 1, explanation: '绠€鍗曪細鏂拌埅璺紶鎾€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鏄庝唬鐨勪笣缁囦笟涓績鏄?, options: ['鏉窞', '鑻忓窞', '鍗椾含', '鎴愰兘'], answerIndex: 1, explanation: '绠€鍗曪細鑻忓窞銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏄庢竻鏃舵湡锛岃憲鍚嶇殑鍟嗗府涓嶅寘鎷?, options: ['鏅嬪晢', '寰藉晢', '绮ゅ晢', '娴欏晢'], answerIndex: 2, explanation: '绠€鍗曪細鏅嬪晢寰藉晢銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏄庢湞涓悗鏈燂紝鍦ㄦ睙鍗楀湴鍖虹殑绾虹粐涓氶儴闂ㄤ腑鍑虹幇鐨勬柊鐨勭敓浜у叧绯绘槸', options: ['灏佸缓鐢熶骇鍏崇郴', '璧勬湰涓讳箟钀岃娊', '濂撮毝鍒?, '鍘熷鍏ぞ'], answerIndex: 1, explanation: '涓瓑锛氭満鎴峰嚭璧勩€佹満宸ュ嚭鍔涖€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '"鏈烘埛鍑鸿祫锛屾満宸ュ嚭鍔?涓殑"鏈烘埛"鏄棭鏈熺殑', options: ['鍐滄皯', '璧勬湰瀹?, '闆囦剑宸ヤ汉', '鍦颁富'], answerIndex: 1, explanation: '涓瓑锛氭棭鏈熻祫鏈銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鍏ㄥ浗鐨勫埗鐡蜂腑蹇冩槸', options: ['鍝ョ獞', '鏅痉闀?, '瀹氱獞', '閽х獞'], answerIndex: 1, explanation: '涓瓑锛氭櫙寰烽晣銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?閮″煄涔嬩笢锛岀殕涔犳満涓氣€︹€﹀伐鍖犲悇鏈変笓鑳姐€傚尃鏈夊父涓伙紝璁℃棩鍙楀€笺€?杩欐鏉愭枡鍙嶆槧浜嗘槑鏈濅腑鍚庢湡', options: ['瀹樿惀鎵嬪伐涓氬彂杈?, '鍑虹幇浜嗛泧浣ｅ叧绯汇€佽祫鏈富涔夎悓鑺?, '瀹跺涵鎵嬪伐涓氫负涓?, '鎵嬪伐涓氳€呮病鏈変汉韬嚜鐢?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃悓鑺姐€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏄庢湞涓悗鏈熷嚭鐜拌祫鏈富涔夎悓鑺界殑鍓嶆彁鏄?, options: ['鍐滀笟鎵嬪伐涓氬彂灞曘€佸晢鍝佺粡娴庢椿璺?, '闂叧閿佸浗鏀跨瓥', '閲嶅啘鎶戝晢鏀跨瓥', '鑷劧缁忔祹瀹屽叏鐡﹁В'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃悓鑺芥潯浠躲€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓浗璧勬湰涓讳箟钀岃娊涓庤タ鏂硅祫鏈富涔夎悓鑺斤紝涓浗', options: ['鍙戝睍杩呴€?, '鍙戝睍缂撴參銆佸缁堝浜庤悓鑺界姸鎬?, '鐩存帴杩涘叆宸ヤ笟闈╁懡', '瀵艰嚧绀句細瀹屽叏杞瀷'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃悓鑺藉懡杩愩€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏄庢竻缁忔祹鍙戝睍鐨勪富瑕佸師鍥犱笉鍖呮嫭', options: ['楂樹骇浣滅墿寮曡繘鎺ㄥ箍', '浜哄彛澶ч噺鍑忓皯', '鎵嬪伐涓氭妧鏈繘姝?, '鍟嗗府鍏磋捣'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粡娴庣幇璞°€? },
    ],
  },

  {
    id: 'g-his-7b-21', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?1璇?鏄庢竻鏃舵湡鐨勭鎶€涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '绉戞妧宸ㄨ憲', content: '鏉庢椂鐝嶃€婃湰鑽夌翰鐩€嬨€佸畫搴旀槦銆婂ぉ宸ュ紑鐗┿€嬨€佸緪鍏夊惎銆婂啘鏀垮叏涔︺€嬨€? },
      { id: 'kp2', title: '灏忚涓庡缓绛?, content: '銆婁笁鍥芥紨涔夈€嬨€婃按娴掍紶銆嬨€婅タ娓歌銆嬨€婄孩妤兼ⅵ銆嬶紝鍖椾含鍩庛€佹晠瀹€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鏄庢湞鏉庢椂鐝嶇紪鍐欑殑鑽墿瀛﹀法钁楁槸', options: ['銆婂崈閲戞柟銆?, '銆婃湰鑽夌翰鐩€?, '銆婂攼鏈崏銆?, '銆婇粍甯濆唴缁忋€?], answerIndex: 1, explanation: '绠€鍗曪細銆婃湰鑽夌翰鐩€嬨€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '琚獕涓?涓浗17涓栫邯鐨勫伐鑹虹櫨绉戝叏涔?鐨勬槸', options: ['銆婃湰鑽夌翰鐩€?, '銆婂ぉ宸ュ紑鐗┿€?, '銆婂啘鏀垮叏涔︺€?, '銆婃ⅵ婧瑪璋堛€?], answerIndex: 1, explanation: '绠€鍗曪細瀹嬪簲鏄熴€婂ぉ宸ュ紑鐗┿€嬨€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鏄庝唬涓€閮ㄥ啘涓氱櫨绉戝叏涔︽槸', options: ['銆婇綈姘戣鏈€?, '銆婂啘鏀垮叏涔︺€?, '銆婂ぉ宸ュ紑鐗┿€?, '銆婂啘妗戣緫瑕併€?], answerIndex: 1, explanation: '绠€鍗曪細寰愬厜鍚€婂啘鏀垮叏涔︺€嬨€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鎴戝浗绔犲洖浣撳皬璇寸殑寮€灞变箣浣滄槸', options: ['銆婃按娴掍紶銆?, '銆婁笁鍥芥紨涔夈€?, '銆婅タ娓歌銆?, '銆婄孩妤兼ⅵ銆?], answerIndex: 1, explanation: '涓瓑锛氱綏璐腑銆婁笁鍥芥紨涔夈€嬨€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鎴戝浗鍙ゅ吀灏忚鐨勯珮宄版槸', options: ['銆婁笁鍥芥紨涔夈€?, '銆婃按娴掍紶銆?, '銆婅タ娓歌銆?, '銆婄孩妤兼ⅵ銆?], answerIndex: 3, explanation: '涓瓑锛氭浌闆姽銆婄孩妤兼ⅵ銆嬨€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鏄庢垚绁栨椂锛屽湪鍏冨ぇ閮藉熀纭€涓婅惀寤虹殑鍖椾含鍩庯紝涓績鏄?, options: ['鐨囧煄', '瀹煄锛堢传绂佸煄锛?, '澶栧煄', '鍐呭煄'], answerIndex: 1, explanation: '涓瓑锛氭晠瀹€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?浠栨槸鏄庝唬鏉板嚭鐨勫尰鑽瀹讹紝缁忚繃27骞寸殑鍔姏锛屽啓鎴愪竴閮ㄨ妯＄┖鍓嶇殑鑽墿瀛﹁憲浣滐紝琚タ鏂瑰浗瀹剁О涓轰笢鏂瑰尰瀛﹀法鍏搞€?浠栨槸', options: ['鍗庝綏', '鏉庢椂鐝?, '瀛欐€濋倛', '寮犱徊鏅?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽垽鏂汉鐗┿€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏄庢竻灏忚绻佽崳鐨勬牴鏈師鍥犳槸', options: ['绉戜妇鍒跺害鎺ㄥ姩', '鍟嗗搧缁忔祹鍙戝睍銆佸競姘戦樁灞傚．澶?, '鐨囧笣涓汉鍠滃ソ', '涓浜ゆ祦棰戠箒'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鍖栬儗鏅€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝銆婂彶璁般€嬩笌銆婅祫娌婚€氶壌銆嬶紝姝ｇ‘鐨勬槸', options: ['閮芥槸绾紶浣?, '銆婂彶璁般€嬬邯浼犱綋閫氬彶銆併€婅祫娌婚€氶壌銆嬬紪骞翠綋閫氬彶', '閮芥槸鏂唬鍙?, '閮界敱鍙搁┈鍏変富缂?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彶瀛﹀弻鐠с€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婄孩妤兼ⅵ銆嬬殑绀句細鎰忎箟鏄?, options: ['鎻忓啓浜嗗攼鍍у彇缁忔晠浜?, '娣卞埢闉尀浜嗗皝寤虹ぜ鏁欏拰灏佸缓鍒跺害銆佹彮绀轰簡灏佸缓绀句細蹇呯劧宕╂簝鐨勫巻鍙茶秼鍔?, '姝岄浜嗘槑鏈啘姘戣捣涔?, '璁茶堪浜嗕笁鍥界悍浜?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彜鍏搁珮宄般€? },
    ],
  },

  {
    id: 'g-his-7b-22', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏄庢竻鏃舵湡锛堣嚦楦︾墖鎴樹簤鍓嶏級锛氱粺涓€澶氭皯鏃忓皝寤哄浗瀹剁殑宸╁浐涓庡彂灞?, edition: '缁熺紪鐗?, section: '绗?2璇?娲诲姩璇?鎴戝浗浼犵粺鑺傛棩鐨勮捣婧愪笌浼犳壙',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-7b', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '浼犵粺鑺傛棩', content: '鏄ヨ妭銆佸厓瀹点€佺鍗堛€佷腑绉嬨€侀噸闃崇瓑銆? },
      { id: 'kp2', title: '鑺傛棩涔犱織', content: '璐存槬鑱斻€佸悆绮藉瓙銆佽祻鏈堛€佺櫥楂樸€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎴戝浗浼犵粺鑺傛棩涓紝琚О涓?骞?鐨勬槸', options: ['鍏冨鑺?, '鏄ヨ妭', '绔崍鑺?, '涓鑺?], answerIndex: 1, explanation: '绠€鍗曪細鏄ヨ妭銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '绔崍鑺傜浉浼犳槸涓轰簡绾康', options: ['瀛斿瓙', '灞堝師', '鏅嬫枃鍏?, '鑻忔'], answerIndex: 1, explanation: '绠€鍗曪細灞堝師銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '涓鑺傜殑涓昏涔犱織鏄?, options: ['鍚冪步瀛?, '璧忔湀銆佸悆鏈堥ゼ', '鐧婚珮', '璧涢緳鑸?], answerIndex: 1, explanation: '绠€鍗曪細璧忔湀銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '閲嶉槼鑺傜殑涓昏涔犱織鏄?, options: ['璐存槬鑱?, '鐧婚珮銆佽祻鑿娿€侀ギ鑿婅姳閰?, '鍚冩湀楗?, '闂硅姳鐏?], answerIndex: 1, explanation: '涓瓑锛氱櫥楂樻暚鑰併€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鍏冨鑺傜殑涓昏涔犱織鏄?, options: ['鎵', '璧忚姳鐏€佸悆鍏冨', '璧涢緳鑸?, '璐存槬鑱?], answerIndex: 1, explanation: '涓瓑锛氶椆鍏冨銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鏄ヨ妭璐存槬鑱旂殑涔犱織璧锋簮浜?, options: ['鍛ㄦ湞', '妗冪銆佷簲浠ｅ悗铚€寮€濮嬮鏄ヨ仈', '鏄庢湞', '娓呮湞'], answerIndex: 1, explanation: '涓瓑锛氭绗︽紨鍙樸€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?榧撳０涓変笅绾㈡棗寮€锛屼袱榫欒穬鍑烘诞姘存潵銆傛９褰辨枴娉㈤涓囧墤锛岄紦澹板妶娴福鍗冮浄銆?鎻忓啓鐨勪紶缁熻妭鏃ユ椿鍔ㄦ槸', options: ['鑸為緳鐏?, '璧涢緳鑸?, '闂硅姳鐏?, '韪╅珮璺?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀鍗堣禌榫欒垷銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗浼犵粺鑺傛棩浣滀负涓€绉嶆枃鍖栫幇璞★紝鍙嶆槧浜?, options: ['鍙や唬鐨勮糠淇?, '涓崕姘戞棌鐨勬枃鍖栬鍚屽拰姘戞棌鍑濊仛鍔?, '灏佸缓钀藉悗', '瀹楁暀鐙傜儹'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鍖栦紶鎵裤€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝绔崍鑺備笌涓鑺傦紝鍏卞悓鐐规槸', options: ['閮戒负绾康灞堝師', '閮芥槸瀵勬墭瀹跺浗鎯呮€€銆佸搴洟鍦嗙殑浼犵粺鑺傛棩', '閮藉湪鍐滃巻浜旀湀', '閮藉悆绮藉瓙'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃妭鏃ユ枃鍖栥€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級浼犳壙浼犵粺鑺傛棩鐨勬剰涔夋槸', options: ['澶嶅彜鍊掗€€', '寮樻壃涓崕浼樼浼犵粺鏂囧寲銆佸寮烘枃鍖栬嚜淇?, '鎶靛埗澶栨潵鏂囧寲', '鎭㈠灏佸缓绀兼暀'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鍖栬嚜淇°€? },
    ],
  },

  {
    id: 'g-his-8a-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '缁熺紪鐗?, section: '绗?璇?楦︾墖鎴樹簤',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鏋楀垯寰愯檸闂ㄩ攢鐑?, content: '1839骞?鏈堟灄鍒欏緪铏庨棬閿€鐑熴€? },
      { id: 'kp2', title: '銆婂崡浜潯绾︺€?, content: '1842骞寸璁紝涓浗寮€濮嬫拨涓哄崐娈栨皯鍦般€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '铏庨棬閿€鐑熺殑棰嗗浜烘槸', options: ['鏋楀垯寰?, '閭撲笘鏄?, '鍏冲ぉ鍩?, '闄堝寲鎴?], answerIndex: 0, explanation: '绠€鍗曪細鏋楀垯寰愩€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '铏庨棬閿€鐑熷彂鐢熶簬', options: ['1839骞?鏈?, '1840骞?鏈?, '1842骞?鏈?, '1856骞?0鏈?], answerIndex: 0, explanation: '绠€鍗曪細1839骞淬€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓浗杩戜唬鍙蹭笂绗竴涓笉骞崇瓑鏉＄害鏄?, options: ['銆婂寳浜潯绾︺€?, '銆婂崡浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 1, explanation: '绠€鍗曪細銆婂崡浜潯绾︺€嬨€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婂崡浜潯绾︺€嬩腑琚壊璁╃粰鑻卞浗鐨勫湴鏂规槸', options: ['涔濋緳鍙?, '棣欐腐宀?, '鏂扮晫', '婢抽棬'], answerIndex: 1, explanation: '涓瓑锛氬壊棣欐腐宀涖€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '銆婂崡浜潯绾︺€嬩腑寮€鏀剧殑閫氬晢鍙ｅ哺涓嶅寘鎷?, options: ['骞垮窞', '涓婃捣', '瀹佹尝', '鍗椾含'], answerIndex: 3, explanation: '涓瓑锛氫簲鍙ｉ€氬晢骞垮帵绂忓畞涓娿€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '楦︾墖鎴樹簤鐖嗗彂鐨勬牴鏈師鍥犳槸', options: ['铏庨棬閿€鐑?, '鑻卞浗涓烘墦寮€涓浗甯傚満銆佸€鹃攢鍟嗗搧', '涓浗闂叧閿佸浗', '涓嫳璐告槗绾犵悍'], answerIndex: 1, explanation: '涓瓑锛氬伐涓氶潻鍛藉悗鎵╁紶銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?鍓查娓矝缁欒嫳鍥斤紱璧旀2100涓囬摱鍏冿紱寮€鏀惧箍宸炪€佸帵闂ㄣ€佺宸炪€佸畞娉€佷笂娴蜂簲澶勪负閫氬晢鍙ｅ哺锛涜嫳鍟嗚繘鍑哄彛璐х墿搴旂撼绋庢锛屽繀椤荤粡杩囧弻鏂瑰崗璁€?璇ユ潯绾︽槸', options: ['銆婂寳浜潯绾︺€?, '銆婂崡浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾潯绾﹀唴瀹广€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級楦︾墖鎴樹簤瀵逛腑鍥界ぞ浼氭€ц川鐨勫奖鍝嶆槸', options: ['涓浗瀹屽叏娌︿负鍗婃畺姘戝湴', '涓浗寮€濮嬩粠灏佸缓绀句細鍙樹负鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '涓浗杩涘叆璧勬湰涓讳箟绀句細', '涓浗瀹炵幇瀹屽叏鐙珛'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀ぞ浼氭€ц川鍙樺寲銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝铏庨棬閿€鐑熶笌楦︾墖鎴樹簤锛屾纭殑鏄?, options: ['铏庨棬閿€鐑熸槸楦︾墖鎴樹簤鏍规湰鍘熷洜', '铏庨棬閿€鐑熸槸楦︾墖鎴樹簤鐩存帴鍘熷洜锛堝鐏嚎锛?, '涓よ€呮鏃犲叧绯?, '楦︾墖鎴樹簤鏄檸闂ㄩ攢鐑熺殑缁х画'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽洜鏋滃叧绯汇€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓浗杩戜唬鍙茬殑寮€绔槸', options: ['鐢插崍涓棩鎴樹簤', '楦︾墖鎴樹簤', '鍏浗鑱斿啗渚靛崕', '杈涗亥闈╁懡'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽巻鍙插垎鏈熴€? },
    ],
  },

  {
    id: 'g-his-8a-2', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '缁熺紪鐗?, section: '绗?璇?绗簩娆￠甫鐗囨垬浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鑻辨硶鑱斿啗鐏儳鍦嗘槑鍥?, content: '1860骞磋嫳娉曡仈鍐涚伀鐑у渾鏄庡洯銆? },
      { id: 'kp2', title: '銆婂ぉ娲ユ潯绾︺€嬨€婂寳浜潯绾︺€?, content: '淇勫浗鍓插崰涓浗鍖楁柟150澶氫竾骞虫柟鍏噷銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍙戝姩绗簩娆￠甫鐗囨垬浜夌殑涓诲嚩鏄?, options: ['鑻辨硶鑱斿啗', '缇庝縿', '鍏浗鑱斿啗', '鑻辨棩鑱斿啗'], answerIndex: 0, explanation: '绠€鍗曪細鑻辨硶銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鐏儳鍦嗘槑鍥彂鐢熶簬', options: ['1842骞?, '1860骞?, '1856骞?, '1900骞?], answerIndex: 1, explanation: '绠€鍗曪細1860骞淬€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '绗簩娆￠甫鐗囨垬浜変腑锛屽壊鍗犱腑鍥介鍦熸渶澶氱殑鍥藉鏄?, options: ['鑻卞浗', '淇勫浗', '娉曞浗', '鏃ユ湰'], answerIndex: 1, explanation: '绠€鍗曪細娌欎縿銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '淇勫浗閫氳繃涓€绯诲垪涓嶅钩绛夋潯绾︼紝鍏卞壊鍗犱腑鍥戒笢鍖楀拰瑗垮寳棰嗗湡', options: ['60澶氫竾骞虫柟鍏噷', '150澶氫竾骞虫柟鍏噷', '100澶氫竾骞虫柟鍏噷', '200澶氫竾骞虫柟鍏噷'], answerIndex: 1, explanation: '涓瓑锛?50涓囥€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鐏儳鍦嗘槑鍥殑寮虹洍鏄?, options: ['鑻辩編鑱斿啗', '鑻辨硶鑱斿啗', '鍏浗鑱斿啗', '鑻辨棩鑱斿啗'], answerIndex: 1, explanation: '涓瓑锛氳嫳娉曡仈鍐涖€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '澧炲紑澶╂触涓哄晢鍩犮€佸壊涔濋緳鍙稿湴鏂逛竴鍖虹粰鑻卞浗鐨勬潯绾︽槸', options: ['銆婂崡浜潯绾︺€?, '銆婂寳浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 1, explanation: '涓瓑锛氥€婂寳浜潯绾︺€嬨€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?鏈変竴澶╋紝涓や釜寮虹洍闂叆浜嗗瀹紝涓€涓姩鎵嬫姠鍔紝涓€涓妸瀹冧粯璇镐竴鐐€?杩欎袱涓?寮虹洍"鏄?, options: ['缇庝縿', '鑻辨硶', '寰锋棩', '淇勬棩'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄洦鏋滆瘎璁恒€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绗簩娆￠甫鐗囨垬浜夊涓浗鐨勫奖鍝嶆槸', options: ['涓浗寮€濮嬫拨涓哄崐娈栨皯鍦?, '涓浗鍗婃畺姘戝湴鍖栫▼搴﹁繘涓€姝ュ姞娣?, '涓浗瀹屽叏娌︿负鍗婃畺姘戝湴', '瀹炵幇浜嗗浗瀹剁嫭绔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽崐娈栨皯鍦板寲銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓ゆ楦︾墖鎴樹簤锛屽叡鍚岀偣鏄?, options: ['閮芥槸鑻卞浗鍗曠嫭鍙戝姩', '閮芥槸鍒楀己涓烘墦寮€涓浗甯傚満鑰屽彂鍔?, '閮芥敾鍏ヤ簡鍖椾含', '閮界璁簡銆婂崡浜潯绾︺€?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾垬浜夋瘮杈冦€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級淇勫浗鍓插崰涓浗澶х墖棰嗗湡涓昏鍙戠敓鍦?, options: ['楦︾墖鎴樹簤鏈熼棿', '绗簩娆￠甫鐗囨垬浜夊墠鍚?, '鐢插崍鎴樹簤鏈熼棿', '鍏浗鑱斿啗渚靛崕鏃?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄鍦熶抚澶便€? },
    ],
  },

  {
    id: 'g-his-8a-3', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 涓浗寮€濮嬫拨涓哄崐娈栨皯鍦板崐灏佸缓绀句細', edition: '缁熺紪鐗?, section: '绗?璇?澶钩澶╁浗杩愬姩',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '閲戠敯璧蜂箟涓庡畾閮藉ぉ浜?, content: '1851骞撮噾鐢拌捣涔夛紝1853骞村畾閮藉ぉ浜€? },
      { id: 'kp2', title: '銆婂ぉ鏈濈敯浜╁埗搴︺€嬩笌銆婅祫鏀挎柊绡囥€?, content: '鍙嶅皝寤虹翰棰嗭紝鍚庢湡娲粊鐜曟柟妗堛€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '澶钩澶╁浗杩愬姩鐨勯琚栨槸', options: ['娲鍏?, '鏉ㄧ娓?, '鐭宠揪寮€', '鏉庣鎴?], answerIndex: 0, explanation: '绠€鍗曪細娲鍏ㄣ€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '澶钩澶╁浗杩愬姩鐖嗗彂鐨勬爣蹇楁槸', options: ['閲戠敯璧蜂箟', '姘稿畨寤哄埗', '瀹氶兘澶╀含', '鍖椾紣'], answerIndex: 0, explanation: '绠€鍗曪細1851骞撮噾鐢般€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '澶钩澶╁浗姝ｅ紡寤虹珛涓庢竻鏀垮簻瀵瑰硻鏀挎潈鐨勬爣蹇楁槸', options: ['閲戠敯璧蜂箟', '瀹氶兘澶╀含', '姘稿畨灏佺帇', '瑗垮緛'], answerIndex: 1, explanation: '绠€鍗曪細1853骞淬€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '澶钩澶╁浗棰佸竷鐨勭翰棰嗘€ф枃浠舵槸', options: ['銆婅祫鏀挎柊绡囥€?, '銆婂ぉ鏈濈敯浜╁埗搴︺€?, '銆婁腑鍗庢皯鍥戒复鏃剁害娉曘€?, '銆婇挦瀹氬娉曞ぇ绾层€?], answerIndex: 1, explanation: '涓瓑锛氥€婂ぉ鏈濈敯浜╁埗搴︺€嬨€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '澶钩澶╁浗鍚庢湡锛屾彁鍑哄悜瑗挎柟瀛︿範銆佹敼闈╁唴鏀跨殑鏄?, options: ['娲鍏?, '娲粊鐜?, '鏉ㄧ娓?, '鏉庣鎴?], answerIndex: 1, explanation: '涓瓑锛氥€婅祫鏀挎柊绡囥€嬨€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '澶钩澶╁浗鐢辩洓杞“鐨勮浆鎶樼偣鏄?, options: ['閲戠敯璧蜂箟', '澶╀含浜嬪彉', '瀹氶兘澶╀含', '鍖椾紣澶辫触'], answerIndex: 1, explanation: '涓瓑锛氬ぉ浜簨鍙樸€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?鍑″垎鐢帮紝鐓т汉鍙ｏ紝涓嶈鐢峰锛岀畻鍏跺浜哄彛澶氬锛屼汉澶氬垯鍒嗗锛屼汉瀵″垯鍒嗗銆?璇ヨ瀹氬嚭鑷?, options: ['銆婅祫鏀挎柊绡囥€?, '銆婂ぉ鏈濈敯浜╁埗搴︺€?, '銆婁腑鍗庢皯鍥界害娉曘€?, '銆婂畾鍥芥槸璇忋€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽钩鍧囧垎閰嶅湡鍦般€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗杩愬姩鐨勬€ц川鏄?, options: ['璧勪骇闃剁骇闈╁懡', '鍙嶅皝寤哄弽渚电暐鐨勫啘姘戞垬浜?, '鏃犱骇闃剁骇闈╁懡', '鍦颁富闃剁骇鑷晳杩愬姩'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽啘姘戞垬浜夈€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝銆婂ぉ鏈濈敯浜╁埗搴︺€嬩笌銆婅祫鏀挎柊绡囥€嬶紝鍏卞悓鐐规槸', options: ['閮戒富寮犲彂灞曡祫鏈富涔?, '閮藉叿鏈夊弽灏佸缓鐨勯潻鍛芥€с€佷絾閮芥湭鑳界湡姝ｅ疄鏂?, '閮界淮鎶ゅ皬鍐滅粡娴?, '閮界敱娲鍏ㄤ翰鎾?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼袱涓翰棰嗐€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級澶钩澶╁浗杩愬姩澶辫触鐨勬牴鏈師鍥犳槸', options: ['涓鍙嶅姩鍔垮姏鑱斿悎缁炴潃', '鍐滄皯闃剁骇鐨勫眬闄愭€?, '澶╀含浜嬪彉鐨勫唴鑰?, '鍖椾紣瀛ゅ啗娣卞叆'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄樁绾у眬闄愩€? },
    ],
  },

  {
    id: 'g-his-8a-4', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 鏃╂湡鐜颁唬鍖栫殑鍒濇鎺㈢储鍜屾皯鏃忓嵄鏈哄姞鍓?, edition: '缁熺紪鐗?, section: '绗?璇?娲嬪姟杩愬姩鍜岃竟鐤嗗嵄鏈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '娲嬪姟杩愬姩', content: '19涓栫邯60-90骞翠唬锛屽錅ｃ€佹浘鏉庡乏寮狅紝鑷己姹傚瘜銆? },
      { id: 'kp2', title: '杩戜唬浼佷笟涓庢捣鍐?, content: '姹熷崡鍒堕€犳€诲眬銆佽疆鑸规嫑鍟嗗眬锛屽寳娲嬭埌闃熴€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '娲嬪姟杩愬姩鐨勫湴鏂逛唬琛ㄤ汉鐗╀笉鍖呮嫭', options: ['鏇惧浗钘?, '鏉庨缚绔?, '宸﹀畻妫?, '搴锋湁涓?], answerIndex: 3, explanation: '绠€鍗曪細搴锋鏄淮鏂版淳銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '娲嬪姟杩愬姩鐨勫彛鍙锋槸', options: ['鎵舵竻鐏磱', '鑷己銆佹眰瀵?, '姘戜富銆佺瀛?, '澶栦簤涓绘潈'], answerIndex: 1, explanation: '绠€鍗曪細鑷己姹傚瘜銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '娲嬪姟杩愬姩鍏磋捣浜?, options: ['19涓栫邯40-50骞翠唬', '19涓栫邯60-90骞翠唬', '19涓栫邯90骞翠唬', '20涓栫邯鍒?], answerIndex: 1, explanation: '绠€鍗曪細60-90骞翠唬銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '娲嬪姟娲惧垱鍔炵殑鏈€澶х殑杩戜唬鍐涗簨宸ヤ笟鏄?, options: ['瀹夊簡鍐呭啗姊版墍', '姹熷崡鍒堕€犳€诲眬', '绂忓窞鑸规斂灞€', '澶╂触鏈哄櫒灞€'], answerIndex: 1, explanation: '涓瓑锛氭睙鍗楀埗閫犳€诲眬銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '娲嬪姟娲惧垱鍔炵殑姘戠敤浼佷笟涓嶅寘鎷?, options: ['杞埞鎷涘晢灞€', '寮€骞崇叅鐭?, '姹夐槼閾佸巶', '姹熷崡鍒堕€犳€诲眬'], answerIndex: 3, explanation: '涓瓑锛氬啗浜嬪伐涓氥€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '娲嬪姟娲剧寤虹殑娴峰啗涓紝瑙勬ā鏈€澶х殑鏄?, options: ['鍗楁磱姘村笀', '鍖楁磱鑸伴槦', '绂忓缓姘村笀', '骞夸笢姘村笀'], answerIndex: 1, explanation: '涓瓑锛氬寳娲嬫按甯堛€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?涓浗鏂囨鍒跺害锛屼簨浜嬭繙鍑鸿タ浜轰箣涓婏紝鐙伀鍣ㄤ竾涓嶈兘鍙娿€?杩欏弽鏄犱簡娲嬪姟娲剧殑鎬濇兂鏄?, options: ['鍏ㄧ洏瑗垮寲', '涓涓轰綋銆佽タ瀛︿负鐢?, '褰诲簳闈╁懡', '鍙嶅涓€鍒囧鏉ヤ簨鐗?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾磱鍔℃€濇兂銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩鐨勬€ц川鏄?, options: ['璧勪骇闃剁骇鏀归潻', '鍦颁富闃剁骇鐨勮嚜鏁戣繍鍔?, '鍐滄皯璧蜂箟', '鍙嶅笣鐖卞浗杩愬姩'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾磱鍔℃€ц川銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級娲嬪姟杩愬姩鐨勭Н鏋佷綔鐢ㄦ槸', options: ['浣夸腑鍥借蛋涓婂瘜寮洪亾璺?, '瀹㈣涓婁績杩涗簡涓浗姘戞棌璧勬湰涓讳箟浜х敓銆佹槸涓浗杩戜唬鍖栧紑绔?, '鎺ㄧ炕浜嗘竻鏈濈粺娌?, '瀹屽叏鎶靛埗浜嗗鍥借祫鏈叆渚?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繎浠ｅ寲寮€绔€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝娲嬪姟杩愬姩涓庢垔鎴屽彉娉曪紝鍏卞悓鐐规槸', options: ['閮戒富寮犲彂灞曡祫鏈富涔?, '閮戒富寮犲悜瑗挎柟瀛︿範銆佹尳鏁戞皯鏃忓嵄浜?, '閮界敱鍦颁富闃剁骇棰嗗', '閮藉缓绔嬩簡姘戜富鏀夸綋'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繎浠ｅ寲鎺㈢储銆? },
    ],
  },

  {
    id: 'g-his-8a-5', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 鏃╂湡鐜颁唬鍖栫殑鍒濇鎺㈢储鍜屾皯鏃忓嵄鏈哄姞鍓?, edition: '缁熺紪鐗?, section: '绗?璇?鐢插崍涓棩鎴樹簤涓庡垪寮虹摐鍒嗕腑鍥界媯娼?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '榛勬捣澶ф垬涓庡▉娴峰崼鎴樺焦', content: '1894鐢插崍鎴樹簤锛岄倱涓栨槍娈夊浗銆? },
      { id: 'kp2', title: '銆婇┈鍏虫潯绾︺€?, content: '1895骞寸璁紝鍓插彴婀撅紝鍗婃畺姘戝湴鍖栧ぇ澶у姞娣便€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鐢插崍涓棩鎴樹簤鐖嗗彂浜?, options: ['1894骞?, '1895骞?, '1898骞?, '1900骞?], answerIndex: 0, explanation: '绠€鍗曪細1894骞淬€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍦ㄩ粍娴峰ぇ鎴樹腑澹儓娈夊浗鐨?鑷磋繙"鑸扮甯︽槸', options: ['涓佹睗鏄?, '閭撲笘鏄?, '鍒樻锜?, '宸﹀疂璐?], answerIndex: 1, explanation: '绠€鍗曪細閭撲笘鏄屻€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '銆婇┈鍏虫潯绾︺€嬬璁簬', options: ['1842骞?, '1895骞?, '1898骞?, '1901骞?], answerIndex: 1, explanation: '绠€鍗曪細1895骞淬€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婇┈鍏虫潯绾︺€嬩腑琚壊璁╃粰鏃ユ湰鐨勯鍦熸槸', options: ['棣欐腐宀?, '杈戒笢鍗婂矝銆佸彴婀惧叏宀涖€佹編婀栧垪宀?, '涔濋緳鍙?, '瑗胯棌'], answerIndex: 1, explanation: '涓瓑锛氬壊鍙版咕銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '銆婇┈鍏虫潯绾︺€嬩腑锛屾竻鏀垮簻璧旀鐧介摱', options: ['2100涓囬摱鍏?, '2浜夸袱', '4.5浜夸袱', '800涓囦袱'], answerIndex: 1, explanation: '涓瓑锛?浜夸袱銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '銆婇┈鍏虫潯绾︺€嬩腑锛岃杩紑鏀剧殑鍟嗗煚涓嶅寘鎷?, options: ['娌欏競', '閲嶅簡', '鑻忓窞', '鍗椾含'], answerIndex: 3, explanation: '涓瓑锛氭矙閲嶈嫃鏉€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?鍓茶窘涓滃崐宀涖€佸彴婀惧叏宀涘強鎵€鏈夐檮灞炲悇宀涘笨銆佹編婀栧垪宀涚粰鏃ユ湰锛涜禂鍋挎棩鏈叺璐圭櫧閾?浜夸袱锛涘紑鏀炬矙甯傘€侀噸搴嗐€佽嫃宸炪€佹澀宸炰负鍟嗗煚锛涘厑璁告棩鏈湪閫氬晢鍙ｅ哺寮€璁惧伐鍘傘€?璇ユ潯绾︽槸', options: ['銆婂崡浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?, '銆婂寳浜潯绾︺€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾潯绾﹀唴瀹广€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婇┈鍏虫潯绾︺€嬩腑鏈€鑳戒綋鐜板笣鍥戒富涔夎祫鏈緭鍑鸿姹傜殑鏉℃鏄?, options: ['鍓插湴', '鍏佽鏃ユ湰鍦ㄩ€氬晢鍙ｅ哺寮€璁惧伐鍘?, '宸ㄩ璧旀', '寮€鍩犻€氬晢'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃祫鏈緭鍑恒€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝楦︾墖鎴樹簤涓庣敳鍗堟垬浜夛紝銆婇┈鍏虫潯绾︺€嬩娇涓浗', options: ['寮€濮嬫拨涓哄崐娈栨皯鍦?, '鍗婃畺姘戝湴鍖栫▼搴﹀ぇ澶у姞娣?, '瀹屽叏娌︿负鍗婃畺姘戝湴', '瀹炵幇浜嗘皯鏃忕嫭绔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾皯鏃忓嵄鏈恒€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鐢插崍鎴樿触鍚庯紝鍒楀己鎺€璧风摐鍒嗕腑鍥界媯娼紝鍏惰〃鐜颁笉鍖呮嫭', options: ['鎶㈠ず鍒╂潈', '寮虹娴锋腐', '鍒掑垎鍔垮姏鑼冨洿', '鎴愮珛鑱斿悎鍥?], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀摐鍒嗙媯娼€? },
    ],
  },

  {
    id: 'g-his-8a-6', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 鏃╂湡鐜颁唬鍖栫殑鍒濇鎺㈢储鍜屾皯鏃忓嵄鏈哄姞鍓?, edition: '缁熺紪鐗?, section: '绗?璇?鎴婃垖鍙樻硶',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍏溅涓婁功涓庣櫨鏃ョ淮鏂?, content: '1895骞村叕杞︿笂涔︼紝1898骞寸櫨鏃ョ淮鏂般€? },
      { id: 'kp2', title: '鎴婃垖鏀垮彉涓庢垔鎴屽叚鍚涘瓙', content: '鎱堢Η鍙戝姩鏀垮彉锛岃碍鍡ｅ悓绛夌壓鐗层€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎷夊紑缁存柊鍙樻硶杩愬姩搴忓箷鐨勪簨浠舵槸', options: ['鍏溅涓婁功', '寮哄浼氭垚绔?, '銆婃椂鍔℃姤銆嬪垱鍒?, '鐧炬棩缁存柊'], answerIndex: 0, explanation: '绠€鍗曪細鍏溅涓婁功銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍏溅涓婁功鐨勫彂璧疯€呮槸', options: ['搴锋湁涓恒€佹鍚秴', '瀛欎腑灞便€侀粍鍏?, '闄堢嫭绉€銆佹潕澶ч拪', '鏇惧浗钘┿€佹潕楦跨珷'], answerIndex: 0, explanation: '绠€鍗曪細搴锋銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鎴婃垖鍙樻硶鍘嗘椂103澶╋紝鍙茬О', options: ['鍏溅涓婁功', '鐧炬棩缁存柊', '娲嬪姟杩愬姩', '杈涗亥闈╁懡'], answerIndex: 1, explanation: '绠€鍗曪細鐧炬棩缁存柊銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鎴婃垖鍙樻硶鏃跺湪浣嶇殑鐨囧笣鏄?, options: ['鍏夌华甯?, '鍚屾不甯?, '鍜镐赴甯?, '瀹ｇ粺甯?], answerIndex: 0, explanation: '涓瓑锛氬厜缁€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鐢樻効涓哄彉娉曟祦琛€鐗虹壊鐨勬槸', options: ['搴锋湁涓?, '璋棧鍚?, '姊佸惎瓒?, '搴峰箍浠?], answerIndex: 1, explanation: '涓瓑锛氳碍鍡ｅ悓銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鎴婃垖鍙樻硶鐨勬€ц川鏄?, options: ['鍦颁富闃剁骇鑷晳杩愬姩', '璧勪骇闃剁骇鎬ц川鐨勬敼鑹繍鍔?, '璧勪骇闃剁骇闈╁懡', '鍐滄皯璧蜂箟'], answerIndex: 1, explanation: '涓瓑锛氳祫浜ч樁绾ф敼鑹€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?绐冮椈涓庢棩鏈鍜屸€︹€︿笅璇忛紦澶╀笅涔嬫皵锛岃縼閮藉畾澶╀笅涔嬫湰锛岀粌鍏靛己澶╀笅涔嬪娍锛屽彉娉曟垚澶╀笅涔嬫不銆?杩欎竴涓诲紶鍑鸿嚜', options: ['銆婃牎閭犲簮鎶楄銆?, '"鍏溅涓婁功"', '銆婂ぉ婕旇銆?, '銆婇潻鍛藉啗銆?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽叕杞︿笂涔︺€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鎴婃垖鍙樻硶澶辫触鐨勬牴鏈師鍥犳槸', options: ['琚佷笘鍑嚭鍗栫淮鏂版淳', '璧勪骇闃剁骇缁存柊娲捐蒋寮便€佷緷闈犳棤瀹炴潈鐨囧笣', '鎱堢Η澶悗鍙戝姩鏀垮彉', '椤藉浐鍔垮姏杩囦簬寮哄ぇ'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄樁绾у眬闄愩€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎴婃垖鍙樻硶鐨勫巻鍙蹭綔鐢ㄦ槸', options: ['鎺ㄧ炕浜嗘竻鏈濈粺娌?, '鍦ㄧぞ浼氫笂璧峰埌鎬濇兂鍚挋浣滅敤', '寤虹珛浜嗗悰涓荤珛瀹埗', '瀹炵幇浜嗗瘜鍥藉己鍏?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾€濇兂鍚挋銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝娲嬪姟杩愬姩涓庢垔鎴屽彉娉曪紝鍚庤€呮柊鍦ㄤ簬', options: ['瀛︿範瑗挎柟鍏堣繘鎶€鏈?, '瀛︿範瑗挎柟鏀挎不鍒跺害銆佸彂灞曡祫鏈富涔?, '缁存姢娓呮湞缁熸不', '鍏村姙杩戜唬浼佷笟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繎浠ｅ寲娣卞叆銆? },
    ],
  },

  {
    id: 'g-his-8a-7', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 鏃╂湡鐜颁唬鍖栫殑鍒濇鎺㈢储鍜屾皯鏃忓嵄鏈哄姞鍓?, edition: '缁熺紪鐗?, section: '绗?璇?涔夊拰鍥㈣繍鍔ㄥ拰鍏浗鑱斿啗渚靛崕',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涔夊拰鍥㈣繍鍔?, content: '1900骞达紝"鎵舵竻鐏磱"锛屽弽甯濈埍鍥姐€? },
      { id: 'kp2', title: '銆婅緵涓戞潯绾︺€?, content: '1901骞寸璁紝涓浗瀹屽叏娌︿负鍗婃畺姘戝湴銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涔夊拰鍥㈣繍鍔ㄦ彁鍑虹殑鍙ｅ彿鏄?, options: ['鍙嶆竻澶嶆槑', '鎵舵竻鐏磱', '椹遍櫎闉戣檹', '骞冲潎鍦版潈'], answerIndex: 1, explanation: '绠€鍗曪細鎵舵竻鐏磱銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涔夊拰鍥㈣繍鍔ㄩ鍏堝叴璧蜂簬', options: ['灞变笢', '鐩撮毝', '娌冲崡', '瀹夊窘'], answerIndex: 0, explanation: '绠€鍗曪細灞变笢銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍏浗鑱斿啗渚靛崕鎴樹簤鐖嗗彂浜?, options: ['1894骞?, '1900骞?, '1901骞?, '1898骞?], answerIndex: 1, explanation: '绠€鍗曪細1900骞淬€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婅緵涓戞潯绾︺€嬬璁簬', options: ['1900骞?, '1901骞?, '1895骞?, '1842骞?], answerIndex: 1, explanation: '涓瓑锛?901骞淬€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '銆婅緵涓戞潯绾︺€嬭瀹氾紝娓呮斂搴滆禂娆剧櫧閾?, options: ['2浜夸袱', '4.5浜夸袱', '2100涓囦袱', '800涓囦袱'], answerIndex: 1, explanation: '涓瓑锛?.5浜夸袱銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '銆婅緵涓戞潯绾︺€嬩腑锛屾渶鑳借鏄庢竻鏀垮簻鎴愪负甯濆浗涓讳箟缁熸不涓浗宸ュ叿鐨勬潯娆炬槸', options: ['宸ㄩ璧旀', '娓呮斂搴滀繚璇佷弗绂佷汉姘戝弬鍔犲悇绉嶅舰寮忕殑鍙嶅笣娲诲姩', '鍒掍笢浜ゆ皯宸蜂负浣块鐣?, '鎷嗘瘉澶ф步鐐彴'], answerIndex: 1, explanation: '涓瓑锛氫弗绂佸弽甯濄€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?绁炲姪鎷筹紝涔夊拰鍥紝鍙洜楝煎瓙闂逛腑鍘熴€?杩欏弽鏄犱箟鍜屽洟杩愬姩', options: ['鍙嶆竻澶嶆槑', '鍙嶅笣鐖卞浗', '鎷ユ姢娓呮湞', '涓诲紶缁存柊'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽弽甯濇€ц川銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婅緵涓戞潯绾︺€嬪涓浗绀句細鐨勫奖鍝嶆槸', options: ['寮€濮嬫拨涓哄崐娈栨皯鍦?, '瀹屽叏娌︿负鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼?, '鍗婃畺姘戝湴鍖栧ぇ澶у姞娣?, '瀹炵幇浜嗘皯鏃忕嫭绔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽畬鍏ㄦ拨涓恒€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝澶钩澶╁浗杩愬姩涓庝箟鍜屽洟杩愬姩锛屽叡鍚岀偣鏄?, options: ['閮戒富寮犲涔犺タ鏂?, '閮芥槸鍐滄皯鍙嶅笣鍙嶅皝寤鸿繍鍔?, '閮藉缓绔嬩簡涓庢竻鏀垮簻瀵瑰硻鐨勬斂鏉?, '閮借涓鍙嶅姩鍔垮姏鑱斿悎缁炴潃'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽啘姘戣繍鍔ㄣ€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婅緵涓戞潯绾︺€嬪垝瀹氱殑浣块鐣屾槸', options: ['涓婃捣澶栨哗', '涓滀氦姘戝贩', '澶╂触浜斿ぇ閬?, '骞垮窞娌欓潰'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼娇棣嗙晫銆? },
    ],
  },

  {
    id: 'g-his-8a-8', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 璧勪骇闃剁骇姘戜富闈╁懡涓庝腑鍗庢皯鍥界殑寤虹珛', edition: '缁熺紪鐗?, section: '绗?璇?涓浗鍚岀洘浼?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '瀛欎腑灞辨棭鏈熼潻鍛?, content: '鍏翠腑浼氾紝涓夋皯涓讳箟銆? },
      { id: 'kp2', title: '涓浗鍚岀洘浼?, content: '1905骞翠笢浜垚绔嬶紝绗竴涓叏鍥芥€ц祫浜ч樁绾ч潻鍛芥斂鍏氥€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1894骞达紝瀛欎腑灞卞湪缇庡浗妾€棣欏北鎴愮珛鐨勯潻鍛藉洟浣撴槸', options: ['鍗庡叴浼?, '鍏翠腑浼?, '鍏夊浼?, '鍚岀洘浼?], answerIndex: 1, explanation: '绠€鍗曪細鍏翠腑浼氥€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '涓浗鍚岀洘浼氭垚绔嬩簬', options: ['1894骞?, '1905骞?, '1911骞?, '1912骞?], answerIndex: 1, explanation: '绠€鍗曪細1905骞翠笢浜€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓浗鍚岀洘浼氱殑鏈哄叧鎶ユ槸', options: ['銆婃椂鍔℃姤銆?, '銆婃皯鎶ャ€?, '銆婂浗闂绘姤銆?, '銆婅嫃鎶ャ€?], answerIndex: 1, explanation: '绠€鍗曪細銆婃皯鎶ャ€嬨€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '瀛欎腑灞遍瀵艰緵浜ラ潻鍛界殑鎸囧鎬濇兂鏄?, options: ['涓夋皯涓讳箟', '姘戜富涓讳箟', '姘戞棌涓讳箟', '姘戞潈涓讳箟'], answerIndex: 0, explanation: '涓瓑锛氫笁姘戜富涔夈€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓夋皯涓讳箟涓嶅寘鎷?, options: ['姘戞棌', '姘戞潈', '姘戠敓', '姘戜富'], answerIndex: 3, explanation: '涓瓑锛氭皯鏃忋€佹皯鏉冦€佹皯鐢熴€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓浗鍚岀洘浼氱殑鎬ц川鏄?, options: ['璧勪骇闃剁骇鏀硅壇鍥綋', '绗竴涓叏鍥芥€х殑缁熶竴鐨勮祫浜ч樁绾ч潻鍛芥斂鍏?, '鏃犱骇闃剁骇鏀垮厷', '鍐滄皯缁勭粐'], answerIndex: 1, explanation: '涓瓑锛氱涓€涓祫浜ч樁绾ф斂鍏氥€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?椹遍櫎闉戣檹锛屾仮澶嶄腑鍗庯紝鍒涚珛姘戝浗锛屽钩鍧囧湴鏉冦€?杩欐槸鍝竴缁勭粐鐨勭翰棰?, options: ['鍏翠腑浼?, '涓浗鍚岀洘浼?, '鍗庡叴浼?, '鍏夊浼?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽悓鐩熶細绾查銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓浗鍚岀洘浼氭垚绔嬬殑鍘嗗彶鎰忎箟鏄?, options: ['鏍囧織鐫€璧勪骇闃剁骇闈╁懡寮€濮?, '浣胯祫浜ч樁绾ф皯涓婚潻鍛借繘鍏ユ柊闃舵', '鎺ㄧ炕浜嗘竻鏈濈粺娌?, '寤虹珛浜嗕腑鍗庢皯鍥?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾斂鍏氫綔鐢ㄣ€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝缁存柊娲句笌闈╁懡娲撅紝鍏卞悓鐐规槸', options: ['閮戒富寮犳毚鍔涢潻鍛?, '閮戒富寮犲悜瑗挎柟瀛︿範銆佸彂灞曡祫鏈富涔?, '閮界淮鎶ゆ竻鏈濈粺娌?, '閮界敱瀛欎腑灞遍瀵?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼袱娲炬瘮杈冦€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓夋皯涓讳箟涓紝鏍稿績鏄?, options: ['姘戞棌', '姘戞潈', '姘戠敓', '姘戜富'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾牳蹇冩€濇兂銆? },
    ],
  },

  {
    id: 'g-his-8a-9', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 璧勪骇闃剁骇姘戜富闈╁懡涓庝腑鍗庢皯鍥界殑寤虹珛', edition: '缁熺紪鐗?, section: '绗?璇?杈涗亥闈╁懡',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '姝︽槍璧蜂箟', content: '1911骞?0鏈?0鏃ユ鏄岃捣涔夈€? },
      { id: 'kp2', title: '涓崕姘戝浗鎴愮珛', content: '1912骞村厓鏃︿腑鍗庢皯鍥戒复鏃舵斂搴滄垚绔嬶紝瀛欎腑灞卞氨浠讳复鏃跺ぇ鎬荤粺銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '姝︽槍璧蜂箟鐖嗗彂浜?, options: ['1911骞?0鏈?0鏃?, '1912骞?鏈?鏃?, '1911骞?0鏈?鏃?, '1912骞?鏈?1鏃?], answerIndex: 0, explanation: '绠€鍗曪細1911骞?0鏈?0鏃ャ€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '杈涗亥闈╁懡棣栧厛鐖嗗彂浜?, options: ['骞垮窞', '姝︽槍', '鍗椾含', '涓婃捣'], answerIndex: 1, explanation: '绠€鍗曪細姝︽槍銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓崕姘戝浗涓存椂鏀垮簻鎴愮珛浜?, options: ['1911骞?0鏈?0鏃?, '1912骞?鏈?鏃?, '1912骞?鏈?2鏃?, '1912骞?鏈?1鏃?], answerIndex: 1, explanation: '绠€鍗曪細1912骞村厓鏃︺€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '涓崕姘戝浗绗竴浠讳复鏃跺ぇ鎬荤粺鏄?, options: ['琚佷笘鍑?, '瀛欎腑灞?, '榛庡厓娲?, '榛勫叴'], answerIndex: 1, explanation: '涓瓑锛氬瓩涓北銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '瀹ｇ粺甯濅笅璇忛€€浣嶏紝娓呮湞260澶氬勾缁熸不缁撴潫鏄湪', options: ['1911骞?0鏈?, '1912骞?鏈?2鏃?, '1912骞?鏈?鏃?, '1912骞?鏈?], answerIndex: 1, explanation: '涓瓑锛?912骞?鏈堛€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓浗鍘嗗彶涓婄涓€閮ㄥ叿鏈夎祫浜ч樁绾у叡鍜屽浗瀹硶鎬ц川鐨勯噸瑕佹枃浠舵槸', options: ['銆婁腑鍗庢皯鍥界害娉曘€?, '銆婁腑鍗庢皯鍥戒复鏃剁害娉曘€?, '銆婇挦瀹氬娉曞ぇ绾层€?, '銆婁腑鍗庢皯鍥藉娉曘€?], answerIndex: 1, explanation: '涓瓑锛氥€婁复鏃剁害娉曘€嬨€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?1911骞?0鏈?0鏃ワ紝姝︽槍鍩庡ご鏋０涓€鍝嶏紝鎷夊紑浜嗕腑鍥藉畬鍏ㄦ剰涔変笂鐨勮繎浠ｆ皯鏃忔皯涓婚潻鍛界殑搴忓箷銆?杩欏満闈╁懡鏄?, options: ['鎴婃垖鍙樻硶', '杈涗亥闈╁懡', '澶钩澶╁浗杩愬姩', '涔夊拰鍥㈣繍鍔?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃緵浜ラ潻鍛姐€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級杈涗亥闈╁懡鐨勫巻鍙插姛缁╂槸', options: ['鎺ㄧ炕浜嗘竻鏈濈粺娌?, '缁撴潫浜嗘垜鍥戒袱鍗冨骞寸殑鍚涗富涓撳埗鍒跺害銆佷娇姘戜富鍏卞拰瑙傚康娣卞叆浜哄績', '瀹屾垚浜嗗弽甯濆弽灏佸缓浠诲姟', '鏀瑰彉浜嗕腑鍥藉崐娈栨皯鍦板崐灏佸缓绀句細鎬ц川'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽巻鍙插姛缁┿€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鎴婃垖鍙樻硶涓庤緵浜ラ潻鍛斤紝鍏卞悓鐐规槸', options: ['閮戒富寮犳毚鍔涙帹缈绘竻鏈?, '閮戒富寮犲彂灞曡祫鏈富涔夈€佹尳鏁戞皯鏃忓嵄浜?, '閮界敱瀛欎腑灞遍瀵?, '閮藉缓绔嬩簡鍏卞拰鍥?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繎浠ｅ寲鎺㈢储銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級杈涗亥闈╁懡澶辫触鐨勬牴鏈〃鐜版槸', options: ['娌℃湁鎺ㄧ炕娓呮湞', '娌℃湁鏀瑰彉鍗婃畺姘戝湴鍗婂皝寤虹ぞ浼氭€ц川銆佹灉瀹炶琚佷笘鍑獌鍙?, '娌℃湁寤虹珛姘戝浗', '娌℃湁棰佸竷绾︽硶'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽け璐ュ眬闄愩€? },
    ],
  },

  {
    id: 'g-his-8a-10', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 璧勪骇闃剁骇姘戜富闈╁懡涓庝腑鍗庢皯鍥界殑寤虹珛', edition: '缁熺紪鐗?, section: '绗?0璇?甯濆埗澶嶈緹涓庡啗闃€鍓叉嵁',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '琚佷笘鍑杈熷笣鍒?, content: '1915骞村簳琚佷笘鍑О甯濓紝鎶ゅ浗鎴樹簤銆? },
      { id: 'kp2', title: '鍐涢榾鍓叉嵁', content: '鍖楁磱鍐涢榾鍒嗚涓虹殩銆佺洿銆佸涓夌郴銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1915骞村簳锛屽甯冪О甯濄€佸杈熷笣鍒剁殑鏄?, options: ['瀛欎腑灞?, '琚佷笘鍑?, '娈电ズ鐟?, '寮犲媼'], answerIndex: 1, explanation: '绠€鍗曪細琚佷笘鍑€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓哄弽瀵硅涓栧嚡澶嶈緹銆佺淮鎶ゅ叡鍜岃€岃捣鍏电殑鏄?, options: ['浜屾闈╁懡', '鎶ゅ浗鎴樹簤', '鎶ゆ硶杩愬姩', '鍖椾紣鎴樹簤'], answerIndex: 1, explanation: '绠€鍗曪細鎶ゅ浗鎴樹簤銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '琚佷笘鍑鍚庯紝鍖楁磱鍐涢榾鍒嗚锛屽叾涓帉鎻″寳浜斂搴溿€佹姇闈犳棩鏈殑鏄?, options: ['鐩寸郴鍐浗鐠?, '鐨栫郴娈电ズ鐟?, '濂夌郴寮犱綔闇?, '妗傜郴闄嗚崳寤?], answerIndex: 1, explanation: '绠€鍗曪細鐨栫郴銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '琚佷笘鍑负寤虹珛鐙缁熸不銆佷笉鎯滄帴鍙楁棩鏈彁鍑虹殑', options: ['銆婂崡浜潯绾︺€?, '"浜屽崄涓€鏉?', '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?], answerIndex: 1, explanation: '涓瓑锛氫簩鍗佷竴鏉°€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍖楁磱鍐涢榾涓紝鍓叉嵁涓滃寳銆佹姇闈犳棩鏈殑鏄?, options: ['鐩寸郴', '濂夌郴', '鐨栫郴', '妗傜郴'], answerIndex: 1, explanation: '涓瓑锛氬紶浣滈湒濂夌郴銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '琚佷笘鍑杈熷笣鍒惰繀閫熷け璐ワ紝璇存槑', options: ['姘戜富鍏卞拰宸茬粡杩囨椂', '姘戜富鍏卞拰瑙傚康娣卞叆浜哄績', '鍐涢榾涓嶅緱浜哄績', '甯濆埗绗﹀悎鍥芥儏'], answerIndex: 1, explanation: '涓瓑锛氬巻鍙叉疆娴併€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?涓囨埛娑曟唱锛屼竴浜哄啝鍐曪紝鍏跺績灏氭湁鍏卞拰浜屽瓧瀛樿€讹紵"杩欑瘒妾勬枃璁ㄤ紣鐨勬槸', options: ['寮犲媼澶嶈緹', '琚佷笘鍑О甯?, '娈电ズ鐟炴墽鏀?, '鏇归敓璐块€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾姢鍥芥垬浜夈€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級琚佷笘鍑杈熷笣鍒惰繀閫熷け璐ョ殑鏍规湰鍘熷洜鏄?, options: ['鎶ゅ浗鎴樹簤鍐涗簨鎵撳嚮', '杈涗亥闈╁懡鍚庢皯涓诲叡鍜岃蹇垫繁鍏ヤ汉蹇?, '甯濆浗涓讳箟鏀惧純鏀寔', '鍖楁磱鍐涢榾闆嗗洟鍒嗚'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽巻鍙叉疆娴併€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝浜屾闈╁懡涓庢姢鍥芥垬浜夛紝鍏卞悓鐐规槸', options: ['閮藉弽瀵硅涓栧嚡', '閮芥槸缁存姢姘戜富鍏卞拰鐨勬枟浜?, '閮界敱瀛欎腑灞辩洿鎺ラ瀵?, '閮藉彇寰楀畬鍏ㄨ儨鍒?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀淮鎶ゅ叡鍜屻€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍐涢榾鍓叉嵁灞€闈㈠舰鎴愮殑褰卞搷鏄?, options: ['缁存姢浜嗗浗瀹剁粺涓€', '杩炲勾娣锋垬銆佺粰浜烘皯甯︽潵娣遍噸鐏鹃毦', '淇冭繘浜嗙粡娴庡彂灞?, '缁撴潫浜嗘竻鏈濈粺娌?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽啗闃€绁稿浗銆? },
    ],
  },

  {
    id: 'g-his-8a-11', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 鏂版皯涓讳富涔夐潻鍛界殑鍏磋捣', edition: '缁熺紪鐗?, section: '绗?1璇?浜斿洓杩愬姩',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '浜斿洓杩愬姩鐖嗗彂', content: '1919骞村反榛庡拰浼氬浜ゅけ璐ワ紝5鏈?鏃ュ寳浜鐢熸父琛屻€? },
      { id: 'kp2', title: '鍘嗗彶鎰忎箟', content: '鏂版皯涓讳富涔夐潻鍛藉紑绔紝鏃犱骇闃剁骇鐧讳笂鑸炲彴銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '浜斿洓杩愬姩鐖嗗彂鐨勫鐏嚎鏄?, options: ['宸撮粠鍜屼細涓浗澶栦氦澶辫触', '淇勫浗鍗佹湀闈╁懡褰卞搷', '鍗庣洓椤夸細璁彫寮€', '銆婁節鍥藉叕绾︺€嬬璁?], answerIndex: 0, explanation: '绠€鍗曪細宸撮粠鍜屼細銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '浜斿洓杩愬姩鐖嗗彂浜?, options: ['1917骞?, '1919骞?, '1921骞?, '1920骞?], answerIndex: 1, explanation: '绠€鍗曪細1919骞淬€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '浜斿洓杩愬姩鍚庢湡锛岃繍鍔ㄤ腑蹇冭浆绉诲埌', options: ['鍖椾含', '涓婃捣', '骞垮窞', '鍗椾含'], answerIndex: 1, explanation: '绠€鍗曪細鍖椾含鍒颁笂娴枫€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '浜斿洓杩愬姩鍚庢湡锛屾垚涓鸿繍鍔ㄤ富鍔涚殑鏄?, options: ['瀛︾敓', '宸ヤ汉闃剁骇', '鍟嗕汉', '璧勪骇闃剁骇'], answerIndex: 1, explanation: '涓瓑锛氭棤浜ч樁绾х櫥涓婅垶鍙般€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '浜斿洓杩愬姩鐨勫彛鍙蜂笉鍖呮嫭', options: ['澶栦簤涓绘潈銆佸唴闄ゅ浗璐?, '鍙栨秷浜屽崄涓€鏉?, '杩樻垜闈掑矝', '鍋滄鍐呮垬銆佷竴鑷存姉鏃?], answerIndex: 3, explanation: '涓瓑锛氭姉鏃ュ彛鍙枫€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '浜斿洓杩愬姩鐨勬€ц川鏄?, options: ['璧勪骇闃剁骇鏀硅壇杩愬姩', '褰诲簳鍙嶅笣鍙嶅皝寤虹殑鐖卞浗闈╁懡杩愬姩', '鍐滄皯璧蜂箟', '鍦颁富闃剁骇鑷晳'], answerIndex: 1, explanation: '涓瓑锛氬交搴曞弽甯濆弽灏佸缓銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛?瀛︾敓涓€鏃ヤ笉鏀撅紝鏈簵涓€鏃ヤ笉寮€銆?"鍥藉灏嗕骸锛屾棤蹇冭惀涓氥€?杩欎簺鏍囪鍙嶆槧浜嗕簲鍥涜繍鍔ㄤ腑鍝竴闃跺眰鐨勬€佸害', options: ['瀛︾敓缃㈣', '鍟嗕汉缃㈠競', '宸ヤ汉缃㈠伐', '鍐滄皯鎶楁崘'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼笁缃㈡枟浜夈€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浜斿洓杩愬姩鐨勫巻鍙叉剰涔夋槸', options: ['鏄腑鍥借繎浠ｅ彶寮€绔?, '鏄腑鍥芥柊姘戜富涓讳箟闈╁懡鐨勫紑绔?, '鏄棫姘戜富涓讳箟闈╁懡寮€绔?, '鏄ぞ浼氫富涔夐潻鍛藉紑绔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾柊姘戜富涓讳箟寮€绔€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝杈涗亥闈╁懡涓庝簲鍥涜繍鍔紝鍚庤€呮柊鍦ㄤ簬', options: ['閮芥槸璧勪骇闃剁骇棰嗗', '宸ヤ汉闃剁骇鐧讳笂鏀挎不鑸炲彴銆佸叿鏈夊箍娉涚兢浼楀熀纭€', '閮藉弽瀵瑰笣鍥戒富涔?, '閮藉湪棣栭兘鐖嗗彂'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾柊鏃ф皯涓诲尯鍒€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浜斿洓绮剧鐨勬牳蹇冩槸', options: ['鐖卞浗涓讳箟', '鏀归潻鍒涙柊', '鑹拌嫤濂嬫枟', '涔愯涓讳箟'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼簲鍥涚簿绁炪€? },
    ],
  },

  {
    id: 'g-his-8a-12', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 鏂版皯涓讳富涔夐潻鍛界殑鍏磋捣', edition: '缁熺紪鐗?, section: '绗?2璇?涓浗鍏变骇鍏氳癁鐢?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡涓€澶?, content: '1921骞村彫寮€锛屽紑澶╄緹鍦帮紝闈╁懡闈㈣矊鐒曠劧涓€鏂般€? },
      { id: 'kp2', title: '涓叡浜屽ぇ绾查', content: '绗竴娆℃彁鍑哄交搴曞弽甯濆弽灏佸缓鐨勬皯涓婚潻鍛界翰棰嗐€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓浗鍏变骇鍏氱涓€娆″叏鍥戒唬琛ㄥぇ浼氬彫寮€浜?, options: ['1919骞?, '1921骞?, '1922骞?, '1923骞?], answerIndex: 1, explanation: '绠€鍗曪細1921骞?鏈堝湪涓婃捣鍙紑銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓叡涓€澶ч€変妇鐨勪腑澶眬涔﹁鏄?, options: ['鏉庡ぇ閽?, '闄堢嫭绉€', '姣涙辰涓?, '寮犲浗鐒?], answerIndex: 1, explanation: '绠€鍗曪細闄堢嫭绉€褰撻€変腑澶眬涔﹁銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鏈€鏃╁湪涓浗绯荤粺浼犳挱椹厠鎬濅富涔夌殑鏄?, options: ['闄堢嫭绉€', '鏉庡ぇ閽?, '鑳￠€?, '椴佽繀'], answerIndex: 1, explanation: '绠€鍗曪細鏉庡ぇ閽婂彂琛ㄣ€婃垜鐨勯┈鍏嬫€濅富涔夎銆嬨€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '涓叡涓€澶ф渶鍚庤浆绉诲埌鍝噷缁х画寮€浼?, options: ['骞垮窞', '鍢夊叴鍗楁箹娓歌埞', '姝︽眽', '鍖楀钩'], answerIndex: 1, explanation: '涓瓑锛氬洜骞叉壈杞Щ鍒板崡婀栨父鑸广€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '涓浗鍘嗗彶涓婄涓€娆℃彁鍑哄交搴曞弽甯濆弽灏佸缓姘戜富闈╁懡绾查鐨勪細璁槸', options: ['涓叡涓€澶?, '涓叡浜屽ぇ', '涓叡涓夊ぇ', '鍏竷浼氳'], answerIndex: 1, explanation: '涓瓑锛?922骞翠腑鍏变簩澶у埗瀹氭渶浣庣翰棰嗐€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '涓浗绗竴涓叡浜у厷鏃╂湡缁勭粐寤虹珛鑰呭拰鍦扮偣鏄?, options: ['鏉庡ぇ閽娿€佸寳浜?, '闄堢嫭绉€銆佷笂娴?, '姣涙辰涓溿€侀暱娌?, '钁ｅ繀姝︺€佹姹?], answerIndex: 1, explanation: '涓瓑锛?920骞撮檲鐙鍦ㄤ笂娴峰缓绔嬨€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岃嚜浠庢湁浜嗕腑鍥藉叡浜у厷锛屼腑鍥介潻鍛界殑闈㈢洰灏辩剷鐒朵竴鏂颁簡銆傘€嶈繖閲屻€屾柊銆嶄笉鍖呮嫭', options: ['鏂扮殑鎸囧鎬濇兂椹厠鎬濅富涔?, '鏂扮殑棰嗗闃剁骇鏃犱骇闃剁骇鏀垮厷', '鏂扮殑濂嬫枟鐩爣瀹炵幇鍏变骇涓讳箟', '鏂扮殑闈╁懡浠诲姟鍙嶅笣鍙嶅皝寤?], answerIndex: 3, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽弽甯濆弽灏佸缓鏃ф皯涓婚潻鍛戒篃鎻愬嚭杩囥€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓浗鍏变骇鍏氳癁鐢熺殑浼熷ぇ鎰忎箟鏄?, options: ['鎻紑鍙樻硶搴忓箷', '寮€澶╄緹鍦扮殑澶т簨鍙橈紝闈╁懡闈㈣矊鐒曠劧涓€鏂?, '鏍囧織鍥藉叡鍚堜綔', '瀹屾垚鍥藉缁熶竴'], answerIndex: 1, explanation: '鐪熼锛氫腑鍥介潻鍛芥湁浜嗗潥寮洪瀵兼牳蹇冦€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓叡浜屽ぇ鍒跺畾鐨勬皯涓婚潻鍛界翰棰嗘槸', options: ['瀹炵幇鍏变骇涓讳箟', '鎵撳€掑啗闃€锛屾帹缈诲笣鍥戒富涔夛紝缁熶竴涓浗涓虹湡姝ｆ皯涓诲叡鍜屽浗', '鍦熷湴闈╁懡', '姝﹁璧蜂箟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾渶浣庣翰棰嗙鍚堜腑鍥藉浗鎯呫€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓叡涓€澶т笌涓叡浜屽ぇ锛屽悗鑰呯殑杩涙鍦ㄤ簬', options: ['纭畾鍏氱殑鍚嶇О', '鍒跺畾鍑虹鍚堜腑鍥藉浗鎯呯殑姘戜富闈╁懡绾查', '閫変妇棰嗗鏈烘瀯', '纭畾涓績宸ヤ綔'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼竴澶х翰棰嗚劚绂诲疄闄呫€? },
    ],
  },

  {
    id: 'g-his-8a-13', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簲鍗曞厓 浠庡浗鍏卞悎浣滃埌鍐滄潙闈╁懡鏍规嵁鍦扮殑寤虹珛', edition: '缁熺紪鐗?, section: '绗?3璇?鍥藉叡鍚堜綔涓庡寳浼愭垬浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?3璇? },
    knowledgePoints: [
      { id: 'kp1', title: '绗竴娆″浗鍏卞悎浣滀笌榛勫煍鍐涙牎', content: '1924鍥芥皯鍏氫竴澶ф爣蹇楀悎浣滃疄鐜帮紝寤洪粍鍩斿啗鏍°€? },
      { id: 'kp2', title: '鍖椾紣涓庣牬瑁?, content: '1926鍖椾紣锛屽洓涓€浜屾斂鍙樿嚧鍚堜綔鐮磋銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绗竴娆″浗鍏卞悎浣滄寮忓缓绔嬬殑鏍囧織鏄?, options: ['涓叡涓夊ぇ', '鍥芥皯鍏氫竴澶?, '榛勫煍鍐涙牎寤虹珛', '鍖椾紣寮€濮?], answerIndex: 1, explanation: '绠€鍗曪細1924骞村浗姘戝厷涓€澶у湪骞垮窞鍙紑銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '榛勫煍鍐涙牎鐨勬斂娌婚儴涓讳换鏄?, options: ['钂嬩粙鐭?, '鍛ㄦ仼鏉?, '寤栦徊鎭?, '瀛欎腑灞?], answerIndex: 1, explanation: '绠€鍗曪細鍛ㄦ仼鏉ヤ换鏀挎不閮ㄤ富浠汇€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍖椾紣鎴樹簤鐨勪富瑕佸璞℃槸', options: ['娓呮斂搴?, '鍚翠僵瀛氥€佸瓩浼犺姵銆佸紶浣滈湒', '琚佷笘鍑?, '鏃ユ湰渚电暐鑰?], answerIndex: 1, explanation: '绠€鍗曪細鍖椾紣鎵撳嚮涓夊ぇ鍐涢榾銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '涓虹鍥涘啗璧㈠緱"閾佸啗"绉板彿鐨勭嫭绔嬪洟鍥㈤暱鏄?, options: ['鍙舵尯', '璐洪緳', '鏈卞痉', '褰痉鎬€'], answerIndex: 0, explanation: '涓瓑锛氬彾鎸虹嫭绔嬪洟灞″缓濂囧姛銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鏍囧織绗竴娆″浗鍏卞悎浣滅牬瑁傜殑浜嬩欢鏄?, options: ['涓北鑸颁簨浠?, '鍥涗竴浜屽拰涓冧竴浜斿弽闈╁懡鏀垮彉', '椹棩浜嬪彉', '鍒嗗叡浼氳'], answerIndex: 1, explanation: '涓瓑锛?927骞磋拫姹彌鍙橀潻鍛姐€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '榛勫煍鍐涙牎鍒涘姙鐨勭洰鐨勬槸', options: ['寤虹珛鏃犱骇闃剁骇鍐涢槦', '鍩瑰吇澶ч噺鍐涗簨鍜屾斂娌讳汉鎵嶃€佸缓绔嬪浗姘戦潻鍛藉啗', '璁粌鍖楁磱鍐?, '鍩瑰吇璀﹀療'], answerIndex: 1, explanation: '涓瓑锛氫负闈╁懡鍩瑰吇鍐涗簨浜烘墠銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛?鎵撳€掑垪寮猴紝鎵撳€掑垪寮猴紝闄ゅ啗闃€锛岄櫎鍐涢榾銆傚浗姘戦潻鍛芥垚鍔燂紝鍥芥皯闈╁懡鎴愬姛锛岄綈娆㈠敱锛岄綈娆㈠敱銆?杩欓鍐涙瓕鍙嶆槧鐨勫巻鍙蹭簨浠舵槸', options: ['杈涗亥闈╁懡', '鍖椾紣鎴樹簤', '鎶楁棩鎴樹簤', '瑙ｆ斁鎴樹簤'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽寳浼愭垬浜夈€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍖椾紣鎴樹簤鑳滃埄杩涘啗鐨勫師鍥犱笉鍖呮嫭', options: ['鍥藉叡鍚堜綔銆侀潻鍛界粺涓€鎴樼嚎', '鍖椾紣鍐涗綔鎴樺媷鏁€佸叡浜у厷鍛樺厛閿嬩綔鐢?, '宸ュ啘缇や紬澶у姏鏀寔', '鍖楁磱鍐涢榾鍥㈢粨涓€鑷?], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽寳浼愯儨鍒┿€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝绗竴娆″浗鍏卞悎浣滀笌杈涗亥闈╁懡锛屽墠鑰呮柊鍦ㄤ簬', options: ['閮界敱鍥芥皯鍏氶瀵?, '鏈変簡闈╁懡姝﹁銆佸箍娉涘彂鍔ㄥ伐鍐滅兢浼?, '閮藉弽瀵瑰笣鍥戒富涔?, '閮藉缓绔嬩簡鍏卞拰鍥?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽悎浣滅壒鐐广€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绗竴娆″浗鍏辩牬瑁傜殑鏁欒鏄?, options: ['蹇呴』鏀惧純闈╁懡棰嗗鏉?, '蹇呴』鎺屾彙闈╁懡姝﹁銆佸潥鎸佹棤浜ч樁绾ч瀵兼潈', '蹇呴』涓庡浗姘戝厷褰诲簳鍐宠', '蹇呴』杩涜鍩庡競璧蜂箟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粡楠屾暀璁€? },
    ],
  },

  {
    id: 'g-his-8a-14', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簲鍗曞厓 浠庡浗鍏卞悎浣滃埌鍐滄潙闈╁懡鏍规嵁鍦扮殑寤虹珛', edition: '缁熺紪鐗?, section: '绗?4璇?姣涙辰涓滃紑杈熶簳鍐堝北閬撹矾',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?4璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍗楁槍璧蜂箟', content: '1927骞?鏈?鏃ユ墦鍝嶆瑁呭弽鎶楀浗姘戝厷鍙嶅姩缁熸不绗竴鏋€? },
      { id: 'kp2', title: '浜曞唸灞遍亾璺?, content: '鍒涘缓绗竴涓啘鏉戦潻鍛芥牴鎹湴锛岃蛋鍐滄潙鍖呭洿鍩庡競閬撹矾銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎵撳搷姝﹁鍙嶆姉鍥芥皯鍏氬弽鍔ㄧ粺娌荤涓€鏋殑鏄?, options: ['绉嬫敹璧蜂箟', '鍗楁槍璧蜂箟', '骞垮窞璧蜂箟', '榛勮姳宀楄捣涔?], answerIndex: 1, explanation: '绠€鍗曪細1927骞?鏈?鏃ュ崡鏄岃捣涔夈€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍗楁槍璧蜂箟鐨勪富瑕侀瀵间汉鏄?, options: ['姣涙辰涓溿€佸懆鎭╂潵', '鍛ㄦ仼鏉ャ€佽春榫欍€佸彾鎸恒€佹湵寰?, '鏉庡ぇ閽娿€侀檲鐙', '瀛欎腑灞便€侀粍鍏?], answerIndex: 1, explanation: '绠€鍗曪細鍛ㄦ仼鏉ョ瓑棰嗗鍗楁槍璧蜂箟銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓浗绗竴涓啘鏉戦潻鍛芥牴鎹湴鏄?, options: ['涓ぎ闈╁懡鏍规嵁鍦?, '浜曞唸灞遍潻鍛芥牴鎹湴', '婀樿担闈╁懡鏍规嵁鍦?, '閯傝鲍鐨栭潻鍛芥牴鎹湴'], answerIndex: 1, explanation: '绠€鍗曪細浜曞唸灞辨牴鎹湴銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆屾斂鏉冩槸鐢辨灙鏉嗗瓙涓彇寰椼€嶈繖涓€钁楀悕璁烘柇鍑鸿嚜', options: ['涓叡涓€澶?, '鍏竷浼氳', '閬典箟浼氳', '鍙ょ敯浼氳'], answerIndex: 1, explanation: '涓瓑锛氬叓涓冧細璁笂姣涙辰涓滄彁鍑恒€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1928骞?鏈堬紝鐜囬儴闃熷埌杈句簳鍐堝北涓庢瘺娉戒笢浼氬笀鐨勬槸', options: ['鏈卞痉銆侀檲姣?, '褰痉鎬€銆佹粫浠ｈ繙', '璐洪緳銆佸懆閫哥兢', '寰愬悜鍓?], answerIndex: 0, explanation: '涓瓑锛氭湵姣涗細甯堬紝缁勫缓宸ュ啘绾㈠啗绗洓鍐涖€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岀孩绫抽キ锛屽崡鐡滄堡锛岀鑼勫瓙锛屽懗濂介锛岄椁愬悆寰楃簿鎵撳厜銆傘€嶈姝岃埃鍙嶆槧鐨勬槸', options: ['鍖椾紣鍐涚敓娲?, '浜曞唸灞辨枟浜夌敓娲?, '闀垮緛閫斾腑鐢熸椿', '鏁屽悗鎶楁垬鐢熸椿'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽弽鏄犱簳鍐堝北鏃舵湡鑹拌嫤鏂椾簤銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鍗楁槍璧蜂箟鐨勫巻鍙叉剰涔夋槸', options: ['鏄腑鍥藉叡浜у厷鐙珛棰嗗姝﹁鏂椾簤銆佸垱寤轰汉姘戝啗闃熺殑寮€濮?, '寤虹珛浜嗙涓€涓啘鏉戞牴鎹湴', '纭珛浜嗘瘺娉戒笢棰嗗鍦颁綅', '鎵撳搷浜嗘姉鏃ョ涓€鏋?], answerIndex: 0, explanation: '涓瓑锛?鏈?鏃ユ垚涓哄缓鍐涜妭銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣涙辰涓滃紑杈熺殑涓浗闈╁懡閬撹矾鏄?, options: ['鍩庡競涓績鏆村姩閬撹矾', '鍐滄潙鍖呭洿鍩庡競銆佹瑁呭ず鍙栨斂鏉冮亾璺?, '鍜屽钩璁細閬撹矾', '鍚堟硶鏂椾簤閬撹矾'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽嵆浜曞唸灞遍亾璺€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級閫夋嫨浜曞唸灞变綔涓烘牴鎹湴锛屼富瑕佸洜涓鸿繖閲?, options: ['鏁屼汉缁熸不鍔涢噺钖勫急銆佸湴鍔块櫓瑕併€佸啘鍐涘熀纭€濂?, '鏄叏鐪佹渶澶у煄甯?, '浜ら€氬崄鍒嗕究鍒?, '宸ヤ笟鏈€鍙戣揪'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀鍚堟晫寮烘垜寮卞舰鍔裤€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍗楁槍璧蜂箟涓庣鏀惰捣涔夛紝绉嬫敹璧蜂箟鐨勬柊鐗圭偣鏄?, options: ['鐩爣鏄敾鍗犲ぇ鍩庡競', '杞悜鍐滄潙銆佸缓绔嬪啘鏉戦潻鍛芥牴鎹湴', '鐢卞浗姘戦潻鍛藉啗鍙戝姩', '鍙戠敓鍦ㄥ箍宸?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽伐浣滈噸蹇冭浆鍚戝啘鏉戙€? },
    ],
  },

  {
    id: 'g-his-8a-15', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簲鍗曞厓 浠庡浗鍏卞悎浣滃埌鍐滄潙闈╁懡鏍规嵁鍦扮殑寤虹珛', edition: '缁熺紪鐗?, section: '绗?5璇?涓浗宸ュ啘绾㈠啗闀垮緛涓庨伒涔変細璁?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?5璇? },
    knowledgePoints: [
      { id: 'kp1', title: '闀垮緛涓庨伒涔変細璁?, content: '绗簲娆″弽鍥村壙澶辫触锛?934骞撮暱寰侊紝1935骞撮伒涔変細璁浆鎶樸€? },
      { id: 'kp2', title: '闀垮緛鑳滃埄', content: '1936骞?0鏈堜笁澶т富鍔涗細瀹佷細甯堬紝杞嵄涓哄畨銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绾㈠啗闀垮緛寮€濮嬩簬', options: ['1933骞?0鏈?, '1934骞?0鏈?, '1935骞?鏈?, '1936骞?0鏈?], answerIndex: 1, explanation: '绠€鍗曪細1934骞?0鏈堜腑澶孩鍐涗粠鐟為噾鍑哄彂銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '闀垮緛閫斾腑鍙紑銆佺‘绔嬫瘺娉戒笢棰嗗鍦颁綅鐨勪細璁槸', options: ['鍏竷浼氳', '鍙ょ敯浼氳', '閬典箟浼氳', '涓叡涓冨ぇ'], answerIndex: 2, explanation: '绠€鍗曪細1935骞?鏈堥伒涔変細璁€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '绾㈠啗涓夊ぇ涓诲姏鑳滃埄浼氬笀銆侀暱寰佺粨鏉熶簬', options: ['1935骞?0鏈堝惔璧烽晣', '1936骞?0鏈堢敇鑲冧細瀹?, '1935骞?鏈堥伒涔?, '1934骞?0鏈堢憺閲?], answerIndex: 1, explanation: '绠€鍗曪細1936骞?0鏈堜細瀹佷細甯堛€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '绾㈠啗闀垮緛鐨勭洿鎺ュ師鍥犳槸', options: ['鍖椾笂鎶楁棩', '绗簲娆″弽鍥村壙澶卞埄', '寮€杈熸柊鏍规嵁鍦?, '浼氬笀澶ч儴闃?], answerIndex: 1, explanation: '涓瓑锛氬崥鍙ゆ潕寰峰乏鍊鹃敊璇嚧鍙嶅洿鍓垮け璐ャ€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '闀垮緛涓墦涔辨晫浜鸿拷鍓胯鍒掔殑鍐涗簨琛屽姩鏄?, options: ['宸ф浮閲戞矙姹?, '鍥涙浮璧ゆ按', '椋炲ず娉稿畾妗?, '寮烘浮澶ф浮娌?], answerIndex: 1, explanation: '涓瓑锛氬洓娓¤丹姘存憜鑴辫拷鍏点€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岀兢榫欏緱棣栬嚜鑵剧繑锛岃矾绾跨簿閫氳蛋涓€琛屻€傘€嶆湵寰锋璇楄禐缇庣殑鏄?, options: ['鍗楁槍璧蜂箟', '閬典箟浼氳纭珛姝ｇ‘棰嗗', '浜曞唸灞变細甯?, '浼氬畞浼氬笀'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾寚閬典箟浼氳鍚庤矾绾挎纭€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '閬典箟浼氳涔嬫墍浠ユ槸鍏氱殑鍘嗗彶涓婄敓姝绘敻鍏崇殑杞姌鐐癸紝鍥犱负瀹?, options: ['瀹ｅ憡浜嗗厷璇炵敓', '纭珛浜嗘瘺娉戒笢鍦ㄥ厷涓ぎ鍜岀孩鍐涚殑棰嗗鍦颁綅', '鎻愬嚭浜嗗交搴曞弽甯濆弽灏佸缓绾查', '纭珛浜嗘瘺娉戒笢鎬濇兂涓烘寚瀵?], answerIndex: 1, explanation: '涓瓑锛氭尳鏁戜簡鍏氬拰绾㈠啗銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绾㈠啗闀垮緛鑳滃埄鐨勯噸澶ф剰涔夋槸', options: ['瀹屾垚浜嗗浗瀹剁粺涓€', '淇濆瓨浜嗗厷鍜岀孩鍐涚殑鍩哄共鍔涢噺锛岃浆鍗变负瀹?, '鎵撹触浜嗘棩鏈镜鐣ヨ€?, '寤虹珛浜嗘柊涓浗'], answerIndex: 1, explanation: '鐪熼锛氶暱寰佹槸瀹ｈ█涔︺€佸浼犻槦銆佹挱绉嶆満銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍏竷浼氳涓庨伒涔変細璁紝閬典箟浼氳鐨勬柊璐＄尞鏄?, options: ['纭畾鍦熷湴闈╁懡鏂归拡', '纭珛姣涙辰涓滀负鏍稿績鐨勬纭瀵笺€佸厷鐙珛鑷富瑙ｅ喅璺嚎闂', '鍐冲畾姝﹁璧蜂箟', '纭珛姣涙辰涓滄€濇兂'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽厷浠庡辜骞磋蛋鍚戞垚鐔熴€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闀垮緛绮剧鐨勬牳蹇冨唴娑垫槸', options: ['鑹拌嫤濂嬫枟銆侀潻鍛戒箰瑙備富涔夈€佷笉鎬曠壓鐗?, '涓汉鑻遍泟涓讳箟', '鍐掗櫓鐩插姩', '鍏抽棬涓讳箟'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽潥瀹氫俊蹇点€佸洟缁撳杩涖€? },
    ],
  },

  {
    id: 'g-his-8a-16', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗叚鍗曞厓 涓崕姘戞棌鐨勬姉鏃ユ垬浜?, edition: '缁熺紪鐗?, section: '绗?6璇?浠庝節涓€鍏簨鍙樺埌瑗垮畨浜嬪彉',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?6璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涔濅竴鍏簨鍙?, content: '1931骞村眬閮ㄦ姉鎴樺紑濮嬶紝涓滃寳娌﹂櫡銆? },
      { id: 'kp2', title: '瑗垮畨浜嬪彉', content: '1936骞村紶鏉ㄥ叺璋忥紝鍜屽钩瑙ｅ喅淇冩垚缁熶竴鎴樼嚎鍒濇褰㈡垚銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓浗浜烘皯灞€閮ㄦ姉鎴樺紑濮嬩簬', options: ['涓冧竷浜嬪彉', '涔濅竴鍏簨鍙?, '涓€浜屽叓浜嬪彉', '鍗庡寳浜嬪彉'], answerIndex: 1, explanation: '绠€鍗曪細1931骞?鏈?8鏃ャ€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涔濅竴鍏簨鍙樺悗锛屼笢鍖椾汉姘戝拰鏈挙璧扮殑涓滃寳鍐涚粍缁囪捣', options: ['鍏矾鍐?, '鎶楁棩涔夊媷鍐?, '鏂板洓鍐?, '鎶楁棩鑱斿啗涔嬪鐨勬皯闂存瑁?], answerIndex: 1, explanation: '绠€鍗曪細涓滃寳鎶楁棩涔夊媷鍐涖€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍙戝姩瑗垮畨浜嬪彉鐨勭埍鍥藉皢棰嗘槸', options: ['寮犲鑹€佹潹铏庡煄', '鏉庡畻浠併€佺櫧宕囩Η', '鍐帀绁ャ€佸悏楦挎槍', '钄″环閿?], answerIndex: 0, explanation: '绠€鍗曪細1936骞?2鏈?2鏃ャ€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '瑗垮畨浜嬪彉鍙戠敓浜?, options: ['1935骞?2鏈?鏃?, '1936骞?2鏈?2鏃?, '1937骞?鏈?鏃?, '1931骞?鏈?8鏃?], answerIndex: 1, explanation: '绠€鍗曪細鍙屽崄浜屼簨鍙樸€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '涓叡涓诲紶鍜屽钩瑙ｅ喅瑗垮畨浜嬪彉锛屽嚭鍙戠偣鏄?, options: ['閲婃斁钂嬩粙鐭?, '鍏ㄦ皯鏃忓埄鐩娿€佸洟缁撴姉鏃?, '鍚戝浗姘戝厷濡ュ崗', '浜夊彇鑻忚仈鎻村姪'], answerIndex: 1, explanation: '涓瓑锛氫腑鏃ユ皯鏃忕煕鐩句笂鍗囦负涓昏鐭涚浘銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '1935骞村寳骞冲鐢熸巰璧风殑鐖卞浗鏁戜骸杩愬姩鏄?, options: ['浜斿洓杩愬姩', '涓€浜屄蜂節杩愬姩', '浜斿崊杩愬姩', '鍙嶉ゥ楗垮弽鍐呮垬杩愬姩'], answerIndex: 1, explanation: '涓瓑锛氫竴浜屄蜂節杩愬姩淇冭繘姘戞棌瑙夐啋銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽ぇ涔夊綋鍓嶏紝涓嶅鍙嶉【锛屽彧姹備簬鏁戜骸涓诲紶璐交鈥︹€﹁█鍑哄繀琛屻€傘€嶅紶鏉ㄥ彂鍔ㄤ簨鍙樼殑鐩殑鏄?, options: ['鎺ㄧ炕鍗椾含鏀垮簻', '閫艰拫鑱斿叡鎶楁棩', '鍙栬€屼唬涔?, '鎶曢檷鏃ユ湰'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽仠姝㈠唴鎴樸€佷竴鑷存姉鏃ャ€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級瑗垮畨浜嬪彉鍜屽钩瑙ｅ喅鐨勯噸澶ф剰涔夋槸', options: ['鍥藉叡绗簩娆″悎浣滄寮忓舰鎴?, '鍗佸勾鍐呮垬鍩烘湰缁撴潫銆佹姉鏃ユ皯鏃忕粺涓€鎴樼嚎鍒濇褰㈡垚', '鍏ㄩ潰鎶楁垬寮€濮?, '涓滃寳鍏夊'], answerIndex: 1, explanation: '鐪熼锛氭壄杞椂灞€鐨勫叧閿€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涔濅竴鍏簨鍙樻渶涓ラ噸鐨勫悗鏋滄槸', options: ['涓滃寳涓夌渷娌﹂櫡', '鍏ㄥ浗鎶楁垬寮€濮?, '鍥藉叡鍚堜綔', '鏃ユ湰鎶曢檷'], answerIndex: 0, explanation: '鐪熼锛氫笢鍖椾竴鐧惧涓囧钩鏂瑰崈绫虫拨闄枫€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涔濅竴鍏簨鍙樹笌涓冧竷浜嬪彉锛屼笉鍚屽湪浜?, options: ['鍓嶈€呭眬閮ㄦ姉鎴樺紑濮嬶紝鍚庤€呭叏姘戞棌鎶楁垬寮€濮?, '閮芥槸鏃ユ湰渚电暐', '閮藉彂鐢熷湪涓滃寳', '閮藉鑷村浗鍏卞悎浣?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼镜鍗庤妯℃墿澶с€? },
    ],
  },

  {
    id: 'g-his-8a-17', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗叚鍗曞厓 涓崕姘戞棌鐨勬姉鏃ユ垬浜?, edition: '缁熺紪鐗?, section: '绗?7璇?涓冧竷浜嬪彉涓庡叏姘戞棌鎶楁垬',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?7璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓冧竷浜嬪彉', content: '1937骞?鏈?鏃ュ叏姘戞棌鎶楁垬寮€濮嬨€? },
      { id: 'kp2', title: '鍥藉叡鍚堜綔涓庡崡浜ぇ灞犳潃', content: '缁熶竴鎴樼嚎姝ｅ紡褰㈡垚锛屾棩鍐涘睜鏉€30涓囦互涓婂悓鑳炪€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓浗鍏ㄦ皯鏃忔姉鎴樺紑濮嬩簬', options: ['涔濅竴鍏簨鍙?, '涓冧竷浜嬪彉', '鍏竴涓変簨鍙?, '鍗庡寳浜嬪彉'], answerIndex: 1, explanation: '绠€鍗曪細1937骞?鏈?鏃ュ崲娌熸ˉ浜嬪彉銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍦ㄥ崲娌熸ˉ濂嬭捣鎶垫姉銆佷负鍥芥崘韬殑浜屽崄涔濆啗灏嗛鏄?, options: ['浣熼簾闃併€佽档鐧荤', '寮犺嚜蹇犮€佹埓瀹夋緶', '鏉ㄩ潠瀹囥€佽档灏氬織', '宸︽潈銆佸江闆灚'], answerIndex: 0, explanation: '绠€鍗曪細浣熼簾闃併€佽档鐧荤娈夊浗銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '1937骞?2鏈堟棩鍐涘湪鍗椾含灞犳潃涓浗灞呮皯鍜屾斁涓嬫鍣ㄥ＋鍏佃揪', options: ['10涓囦汉浠ヤ笂', '20涓囦汉浠ヤ笂', '30涓囦汉浠ヤ笂', '50涓囦汉浠ヤ笂'], answerIndex: 2, explanation: '绠€鍗曪細鍗椾含澶у睜鏉€30涓囦汉浠ヤ笂銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鎶楁棩姘戞棌缁熶竴鎴樼嚎姝ｅ紡寤虹珛鐨勬爣蹇楁槸', options: ['瑗垮畨浜嬪彉鍜屽钩瑙ｅ喅', '鍥芥皯鍏氫腑澶€氳绀惧彂琛ㄤ腑鍏变腑澶负鍏竷鍥藉叡鍚堜綔瀹ｈ█', '涓冧竷浜嬪彉', '绾㈠啗鏀圭紪'], answerIndex: 1, explanation: '涓瓑锛?937骞?鏈堝彂琛ㄥ瑷€銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鏍规嵁鍥藉叡鍚堜綔鍗忚锛屼腑鍥藉伐鍐滅孩鍐涗富鍔涙敼缂栦负', options: ['鍏矾鍐?, '鏂板洓鍐?, '鎶楁棩鑱斿啗', '鍥芥皯闈╁懡鍐涙柊缂栫鍥涘啗'], answerIndex: 0, explanation: '涓瓑锛氭湵寰枫€佸江寰锋€€浠绘鍓€绘寚鎸ャ€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍗楁柟鍏渷鐨勭孩鍐涙父鍑婚槦鏀圭紪涓?, options: ['鍏矾鍐?, '鏂板洓鍐?, '绗崄涔濊矾鍐?, '鎶楁棩鍏堥仯闃?], answerIndex: 1, explanation: '涓瓑锛氬彾鎸轰换鍐涢暱銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岋紙鏃ュ啗锛夋妸涓浗浜哄綋浣滃皠鍑汇€佸埡鏉€鐨勬椿闈垛€︹€︺€嶈鏉愭枡璁板綍鐨勬槸', options: ['鏃呴『澶у睜鏉€', '鍗椾含澶у睜鏉€', '娼樺宄儴妗?, '涓夊厜鏀跨瓥'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽崡浜ぇ灞犳潃鏆磋銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍥藉叡绗簩娆″悎浣滆兘澶熷疄鐜扮殑鏍规湰鍘熷洜鏄?, options: ['瑗垮畨浜嬪彉鎺ㄥ姩', '涓棩姘戞棌鐭涚浘涓婂崌涓轰腑鍥界ぞ浼氫富瑕佺煕鐩?, '涓叡璁╂', '鑻辩編淇冩垚'], answerIndex: 1, explanation: '鐪熼锛氭皯鏃忓嵄鏈哄帇鍊掍竴鍒囥€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涔濅竴鍏簨鍙樹笌涓冧竷浜嬪彉锛屽悗鑰呯殑涓嶅悓鏄?, options: ['鏃ュ啗瀵绘壘鍊熷彛', '鏃ユ湰鍙戝姩浜嗗叏闈镜鍗庢垬浜?, '涓浗鍐涢槦鎶垫姉', '鍙戠敓鍦ㄥ崕鍖?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀敱灞€閮ㄤ镜鍗庡埌鍏ㄩ潰渚靛崕銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍗椾含澶у睜鏉€缁欐垜浠殑鍚ず鏄?, options: ['蹇樿鍘嗗彶', '閾鍘嗗彶銆佸弽瀵规垬浜夈€佺弽鐖卞拰骞?, '澶嶄粐鎺掑', '寮辫倝寮洪'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼互鍙蹭负閴淬€? },
    ],
  },

  {
    id: 'g-his-8a-18', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗叚鍗曞厓 涓崕姘戞棌鐨勬姉鏃ユ垬浜?, edition: '缁熺紪鐗?, section: '绗?8璇?鍏ㄦ皯鏃忔姉鎴樹腑鐨勬闈㈡垬鍦哄拰鏁屽悗鎴樺満',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?8璇? },
    knowledgePoints: [
      { id: 'kp1', title: '姝ｉ潰鎴樺満', content: '娣炴勃浼氭垬銆佸彴鍎垮簞鎴樺焦銆佹姹変細鎴樸€? },
      { id: 'kp2', title: '鏁屽悗鎴樺満', content: '骞冲瀷鍏冲ぇ鎹枫€佺櫨鍥㈠ぇ鎴橈紝寤跺畨鏄€诲悗鏂广€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎶楁垬浠ユ潵涓浗姝ｉ潰鎴樺満鍙栧緱鐨勬渶澶ц儨浠椾箣涓€鏄?, options: ['骞冲瀷鍏冲ぇ鎹?, '鍙板効搴勬垬褰?, '娣炴勃浼氭垬', '姝︽眽浼氭垬'], answerIndex: 1, explanation: '绠€鍗曪細鏉庡畻浠佹寚鎸ュ彴鍎垮簞澶ф嵎銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鍏ㄦ皯鏃忔姉鎴樼垎鍙戝悗涓浗鍐涢槦鍙栧緱鐨勭涓€涓儨鍒╂槸', options: ['骞冲瀷鍏冲ぇ鎹?, '鍙板効搴勬垬褰?, '鐧惧洟澶ф垬', '娣炴勃浼氭垬'], answerIndex: 0, explanation: '绠€鍗曪細1937骞?鏈堝钩鍨嬪叧澶ф嵎銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '1940骞村江寰锋€€鎸囨尌銆佷富鍔ㄥ嚭鍑绘棩鍐涜妯℃渶澶х殑鎴樺焦鏄?, options: ['骞冲瀷鍏冲ぇ鎹?, '鍙板効搴勬垬褰?, '鐧惧洟澶ф垬', '娣炴勃浼氭垬'], answerIndex: 2, explanation: '绠€鍗曪細鐧惧洟澶ф垬鐮磋浜ら€氱嚎銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鎵撶牬鏃ユ湰3涓湀鐏骸涓浗杩锋ⅵ鐨勬垬褰规槸', options: ['娣炴勃浼氭垬', '寰愬窞浼氭垬', '姝︽眽浼氭垬', '闀挎矙浼氭垬'], answerIndex: 0, explanation: '涓瓑锛氭窞娌細鎴樺巻鏃朵笁涓湀銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鎶楁棩鎴樹簤杩涘叆鐩告寔闃舵鐨勬爣蹇楁槸', options: ['娣炴勃浼氭垬缁撴潫', '骞垮窞銆佹姹夊け瀹?, '鍙板効搴勬垬褰?, '鍗椾含娌﹂櫡'], answerIndex: 1, explanation: '涓瓑锛?938骞?0鏈堝悗杩涘叆鐩告寔闃舵銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鏁屽悗鎴樺満鐨勬垬鐣ユ€诲悗鏂瑰拰鎸囨尌涓灑鏄?, options: ['鐟為噾', '寤跺畨', '瑗挎煆鍧?, '閬典箟'], answerIndex: 1, explanation: '涓瓑锛氬欢瀹夋槸涓叡涓ぎ鎵€鍦ㄥ湴銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岋紙姝ゅ焦锛夋垬绾块暱杈?000澶氬崈绫筹紝浣滄垬1800浣欐锛岀牬鍧忎氦閫氱嚎銆傘€嶈鎴樺焦鏄?, options: ['鍙板効搴勬垬褰?, '鐧惧洟澶ф垬', '娣炴勃浼氭垬', '骞冲瀷鍏冲ぇ鎹?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀櫨鍥㈠ぇ鎴樿妯″法澶с€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姝ｉ潰鎴樺満涓庢晫鍚庢垬鍦虹殑鍏崇郴鏄?, options: ['鐩镐簰瀵圭珛', '鐩镐簰閰嶅悎銆佸叡鍚屾姉鏁?, '鏁屽悗鎴樺満涓轰富', '姝ｉ潰鎴樺満涓轰富'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼袱涓垬鍦虹浉浜掍緷瀛樸€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級骞冲瀷鍏冲ぇ鎹蜂笌鐧惧洟澶ф垬鐨勭浉浼肩偣鏄?, options: ['閮界敱鍥芥皯鍏氭寚鎸?, '閮芥槸鍏矾鍐涘湪鏁屽悗鎴樺満鍙栧緱鐨勬垬缁?, '閮藉彂鐢熷湪鐩告寔闃舵', '閮藉湪涓滃寳'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄兘鏄叡浜у厷棰嗗銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍙板効搴勬垬褰瑰睘浜?, options: ['鏁屽悗鎴樺満', '姝ｉ潰鎴樺満', '涓滃寳鎴樺満', '澶钩娲嬫垬鍦?], answerIndex: 1, explanation: '鐪熼锛氭潕瀹椾粊绗簲鎴樺尯姝ｉ潰浣滄垬銆? },
    ],
  },

  {
    id: 'g-his-8a-19', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗叚鍗曞厓 涓崕姘戞棌鐨勬姉鏃ユ垬浜?, edition: '缁熺紪鐗?, section: '绗?9璇?鎶楁棩鎴樹簤鐨勮儨鍒?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?9璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡涓冨ぇ', content: '1945骞寸‘绔嬫瘺娉戒笢鎬濇兂涓哄厷鐨勬寚瀵兼€濇兂銆? },
      { id: 'kp2', title: '鑳滃埄鍙婃剰涔?, content: '1945骞?鏈?5鏃ユ棩鏈姇闄嶏紝鍙版咕鍥炲綊銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓叡涓冨ぇ纭珛鐨勫厷鐨勬寚瀵兼€濇兂鏄?, options: ['椹厠鎬濅富涔?, '姣涙辰涓滄€濇兂', '閭撳皬骞崇悊璁?, '涓夋皯涓讳箟'], answerIndex: 1, explanation: '绠€鍗曪細1945骞村欢瀹変腑鍏变竷澶с€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鏃ユ湰瀹ｅ竷鏃犳潯浠舵姇闄嶆槸鍦?, options: ['1945骞?鏈?5鏃?, '1945骞?鏈?鏃?, '1945骞?鏈?鏃?, '1945骞?0鏈?5鏃?], answerIndex: 0, explanation: '绠€鍗曪細8鏈?5鏃ュ甯冿紝9鏈?鏃ョ鎶曢檷涔︺€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '琚棩鏈畺姘?0骞淬€?945骞村洖鍒扮鍥芥€€鎶辩殑鏄?, options: ['涓滃寳', '鍙版咕', '棣欐腐', '婢抽棬'], answerIndex: 1, explanation: '绠€鍗曪細1945骞?0鏈?5鏃ュ彴婀惧厜澶嶃€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鎶楁棩鎴樹簤鑳滃埄鐨勬牴鏈師鍥犳槸', options: ['鑻忚仈鍑哄叺', '缇庡浗鎶曟幏鍘熷瓙寮?, '鍥藉叡鍚堜綔銆佸疄琛屽叏姘戞棌鎶楁垬', '鍥介檯鎻村姪'], answerIndex: 2, explanation: '涓瓑锛氬叏姘戞棌鎶楁垬鏄牴鏈繚璇併€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓叡涓冨ぇ鍙紑浜?, options: ['1942骞?, '1945骞?, '1949骞?, '1935骞?], answerIndex: 1, explanation: '涓瓑锛氭姉鎴樿儨鍒╁墠澶曞湪寤跺畨鍙紑銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '杩戜唬浠ユ潵涓浗浜烘皯鍙嶆姉澶栨晫鍏ヤ镜绗竴娆″彇寰楀畬鍏ㄨ儨鍒╃殑姘戞棌瑙ｆ斁鎴樹簤鏄?, options: ['楦︾墖鎴樹簤', '鐢插崍涓棩鎴樹簤', '鎶楁棩鎴樹簤', '涓硶鎴樹簤'], answerIndex: 2, explanation: '涓瓑锛氬交搴曟墦璐ユ棩鏈镜鐣ヨ€呫€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽湪杩欏満鎴樹簤涓紝涓浗鎴樺満鏄笘鐣屽弽娉曡タ鏂垬浜夌殑涓滄柟涓绘垬鍦恒€傘€嶈繖璇存槑鎶楁棩鎴樹簤', options: ['鍙槸涓浗鍐呮垬', '鏄笘鐣屽弽娉曡タ鏂垬浜夌殑閲嶈缁勬垚閮ㄥ垎', '鐢辩編鍥介瀵?, '鍙戠敓鍦ㄦ娲?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼腑鍥藉浗闄呭湴浣嶆彁楂樸€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鎶楁棩鎴樹簤鑳滃埄鐨勪紵澶ф剰涔夋槸', options: ['瀹屾垚浜嗗浗瀹剁粺涓€', '鏄腑鍗庢皯鏃忕敱琛拌触鍒版尟鍏寸殑杞姌鐐广€佹彁楂樹簡鍥介檯鍦颁綅', '缁撴潫浜嗗崐娈栨皯鍦?, '寤虹珛浜嗘柊涓浗'], answerIndex: 1, explanation: '鐪熼锛氬紑杈熶簡姘戞棌澶嶅叴鐨勫厜鏄庡墠鏅€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓叡涓冨ぇ鐨勯噸瑕佷綔鐢ㄦ槸', options: ['鍒跺畾浜嗘姉鏃ョ翰棰?, '涓哄ず鍙栨姉鎴樿儨鍒╁拰鏂版皯涓讳富涔夐潻鍛借儨鍒╁噯澶囦簡鏉′欢', '鍐冲畾涓滃緛', '绾犳浜嗗乏鍊鹃敊璇?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叏鍏氳揪鍒扮┖鍓嶅洟缁撱€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鐢插崍鎴樹簤涓庢姉鏃ユ垬浜変竴璐ヤ竴鑳滐紝鍏抽敭鍦ㄤ簬', options: ['姝﹀櫒浼樺姡', '鏄惁瀹炵幇鍏ㄦ皯鏃忔姉鎴?, '鍥介檯鐜', '鐨囧笣鏄惁鑻辨槑'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叏姘戞棌鎶楁垬鑷磋儨銆? },
    ],
  },

  {
    id: 'g-his-8a-20', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竷鍗曞厓 浜烘皯瑙ｆ斁鎴樹簤', edition: '缁熺紪鐗?, section: '绗?0璇?鍥芥皯鍏氭寫璧峰唴鎴?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '閲嶅簡璋堝垽', content: '1945骞寸鍙屽崄鍗忓畾锛屼簤鍙栧拰骞虫皯涓汇€? },
      { id: 'kp2', title: '鍐呮垬鐖嗗彂', content: '1946骞磋繘鏀讳腑鍘熻В鏀惧尯锛屽叏闈㈠唴鎴樼垎鍙戙€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓轰簤鍙栧拰骞筹紝姣涙辰涓滀翰璧撮噸搴嗚皥鍒ゆ槸鍦?, options: ['1945骞?鏈?, '1946骞?鏈?, '1945骞?0鏈?, '1949骞?鏈?], answerIndex: 0, explanation: '绠€鍗曪細1945骞?鏈堣荡閲嶅簡銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '閲嶅簡璋堝垽鏈€缁堢缃茬殑鍗忓畾鏄?, options: ['鍙屽崄鍗忓畾', '鍋滄垬鍗忓畾', '鍜屽钩寤哄浗鍗忓畾', '鍏卞悓绾查'], answerIndex: 0, explanation: '绠€鍗曪細10鏈?0鏃ョ缃蹭細璋堢邯瑕併€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍏ㄩ潰鍐呮垬鐖嗗彂鐨勬爣蹇楁槸', options: ['鍥芥皯鍏氳繘鏀讳腑鍘熻В鏀惧尯', '杩涙敾闄曞寳', '杩涙敾灞变笢', '閲嶇偣杩涙敾'], answerIndex: 0, explanation: '绠€鍗曪細1946骞?鏈堣繘鏀讳腑鍘熴€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '钂嬩粙鐭崇數閭€姣涙辰涓滆荡閲嶅簡璋堝垽鐨勭湡瀹炵洰鐨勬槸', options: ['鐪熷績璋嬫眰鍜屽钩', '涓哄彂鍔ㄥ唴鎴樹簤鍙栨椂闂?, '寤虹珛鑱斿悎鏀垮簻', '鎵胯瑙ｆ斁鍖?], answerIndex: 1, explanation: '涓瓑锛氬亣鍜屽钩銆佺湡鍐呮垬銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1947骞村浗姘戝厷鍐涢槦閲嶇偣杩涙敾鐨勪袱涓В鏀惧尯鏄?, options: ['闄曞寳鍜屽北涓?, '涓師鍜屽崕涓?, '涓滃寳鍜屽崕鍖?, '鏅嬪唨椴佽鲍'], answerIndex: 0, explanation: '涓瓑锛氶噸鐐硅繘鏀婚檿鍖椼€佸北涓溿€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '闄悓姣涙辰涓滆荡閲嶅簡璋堝垽鐨勬槸', options: ['鍛ㄦ仼鏉ャ€佺帇鑻ラ', '鏈卞痉銆佸垬灏戝', '閭撳皬骞炽€佸垬浼壙', '鍙跺墤鑻?], answerIndex: 0, explanation: '涓瓑锛氬懆鎭╂潵闄悓鍓嶅線銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岄剻浜轰簾鎰夸笌鍏堢敓浼氳锛屽叡鍟嗗拰骞冲缓鍥戒箣澶ц銆傘€嶈拫浠嬬煶杩炲彂涓夌數鐨勭湡瀹炵敤鎰忔槸', options: ['鐪熻皨鍜屽钩', '涓哄唴鎴樹簤鍙栧噯澶囨椂闂淬€佹妸鍐呮垬璐ｄ换鎺ㄧ粰涓叡', '閭€璇峰弬鏀?, '缁撴潫璁斂'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽亣鍜屽钩闃磋皨銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浜烘皯瑙ｆ斁鍐涘湪鍐呮垬鍒濇湡鐨勪綔鎴樼洰鏍囨槸', options: ['淇濆崼瑙ｆ斁鍖恒€佺矇纰庡叏闈㈣繘鏀诲拰閲嶇偣杩涙敾', '娓℃睙浣滄垬', '鏀诲崰澶у煄甯?, '淇濆崼寤跺畨'], answerIndex: 0, explanation: '鐪熼锛氫互杩愬姩鎴樻鐏晫浜烘湁鐢熷姏閲忋€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣涙辰涓滀翰璧撮噸搴嗚皥鍒ょ殑閲嶅ぇ鎰忎箟鏄?, options: ['瀹炵幇浜嗗拰骞?, '鎴崇┛浜嗚拫浠嬬煶鍋囧拰骞崇殑闃磋皨銆佽〃鏄庝簡涓叡鍜屽钩璇氭剰', '绛捐浜嗗娉?, '鑱斿悎鏀垮簻鎴愮珛'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾斂娌讳笂璧㈠緱涓诲姩銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍥芥皯鍏氬啗闃熷湪鍏靛姏瑁呭鍗犱紭鎯呭喌涓嬭繀閫熼櫡鍏ヨ鍔紝鏍规湰鍘熷洜鏄?, options: ['鎸囨尌澶辫', '杩濊儗浜烘皯鍒╃泭銆佷抚澶辨皯蹇?, '姝﹀櫒钀藉悗', '灏嗛鏃犺兘'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼汉蹇冨悜鑳屽喅瀹氳儨璐熴€? },
    ],
  },

  {
    id: 'g-his-8a-21', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竷鍗曞厓 浜烘皯瑙ｆ斁鎴樹簤', edition: '缁熺紪鐗?, section: '绗?1璇?浜烘皯瑙ｆ斁鎴樹簤鐨勮儨鍒?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鎴樼暐杩涙敾', content: '鍒橀倱澶у啗鎸鸿繘澶у埆灞憋紝鎻紑鎴樼暐杩涙敾搴忓箷銆? },
      { id: 'kp2', title: '涓夊ぇ鎴樺焦涓庢浮姹熸垬褰?, content: '涓诲姏鍐虫垬锛岃В鏀惧崡浜紝鍥芥皯鍏氭斂鏉冨灝鍙般€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎻紑浜烘皯瑙ｆ斁鍐涙垬鐣ヨ繘鏀诲簭骞曠殑鏄?, options: ['杞垬闄曞寳', '鍒橀倱澶у啗鎸鸿繘澶у埆灞?, '涓夊ぇ鎴樺焦', '娓℃睙鎴樺焦'], answerIndex: 1, explanation: '绠€鍗曪細1947骞村鎸鸿繘涓師銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '瑙ｆ斁涓滃寳鍏ㄥ鐨勬垬褰规槸', options: ['杈芥矆鎴樺焦', '娣捣鎴樺焦', '骞虫触鎴樺焦', '娓℃睙鎴樺焦'], answerIndex: 0, explanation: '绠€鍗曪細杈芥矆鎴樺焦瑙ｆ斁涓滃寳銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '浠ュ皯鑳滃銆佽В鏀鹃暱姹熶腑涓嬫父浠ュ寳骞垮ぇ鍦板尯鐨勬垬褰规槸', options: ['杈芥矆鎴樺焦', '娣捣鎴樺焦', '骞虫触鎴樺焦', '瀛熻壇宕垬褰?], answerIndex: 1, explanation: '绠€鍗曪細娣捣鎴樺焦銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '浣垮崕鍖楀叏澧冨熀鏈В鏀俱€佸寳骞冲拰骞宠В鏀剧殑鎴樺焦鏄?, options: ['杈芥矆鎴樺焦', '娣捣鎴樺焦', '骞虫触鎴樺焦', '澶師鎴樺焦'], answerIndex: 2, explanation: '涓瓑锛氬倕浣滀箟鐜囬儴鎺ュ彈鍜屽钩鏀圭紪銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1949骞?鏈堣В鏀惧崡浜€佺粨鏉熷浗姘戝厷鏀挎潈缁熸不鐨勬垬褰规槸', options: ['涓夊ぇ鎴樺焦', '娓℃睙鎴樺焦', '涓婃捣鎴樺焦', '瑗垮寳鎴樺焦'], answerIndex: 1, explanation: '涓瓑锛?鏈?3鏃ュ崡浜В鏀俱€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓夊ぇ鎴樺焦鍏辨鐏拰鏀圭紪鍥芥皯鍏氬啗闃熺害', options: ['100澶氫竾浜?, '150澶氫竾浜?, '80澶氫竾浜?, '200澶氫竾浜?], answerIndex: 1, explanation: '涓瓑锛氬浗姘戝厷鍐涢槦涓诲姏鍩烘湰琚秷鐏€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岄挓灞遍闆ㄨ捣鑻嶉粍锛岀櫨涓囬泟甯堣繃澶ф睙銆傘€嶈璇楁弿鍐欑殑鏄?, options: ['杈芥矆鎴樺焦', '娣捣鎴樺焦', '娓℃睙鎴樺焦', '寮€鍥藉ぇ鍏?], answerIndex: 2, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃В鏀惧崡浜€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓夊ぇ鎴樺焦鐨勫巻鍙叉剰涔夋槸', options: ['瑙ｆ斁浜嗗叏鍥?, '鍩烘湰涓婃秷鐏簡鍥芥皯鍏氬啗闃熶富鍔涳紝澶уぇ鍔犻€熶簡瑙ｆ斁鎴樹簤鍦ㄥ叏鍥界殑鑳滃埄', '鎺ㄧ炕浜嗘竻鐜嬫湞', '瀹屾垚浜嗗浗瀹剁粺涓€'], answerIndex: 1, explanation: '鐪熼锛氭垬鐣ュ喅鎴樿儨鍒┿€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浜烘皯瑙ｆ斁鎴樹簤杩呴€熻儨鍒╃殑涓昏鍘熷洜涓嶅寘鎷?, options: ['涓叡姝ｇ‘棰嗗', '浜烘皯缇や紬鏀寔', '瑙ｆ斁鍐涜嫳鍕囦綔鎴?, '缇庡浗鍏ㄥ姏鏀寔鍥芥皯鍏?], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀編鎻存尳鏁戜笉浜嗘皯蹇冧抚澶便€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鎴樼暐闃插尽銆佽繘鏀汇€佸喅鎴樹笁涓樁娈碉紝鍏惰浆鎶樼偣鏄?, options: ['绮夌閲嶇偣杩涙敾', '鍒橀倱澶у啗鎸鸿繘澶у埆灞?, '涓夊ぇ鎴樺焦', '娓℃睙鎴樺焦'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀敱鍐呯嚎浣滄垬杞悜澶栫嚎銆? },
    ],
  },

  {
    id: 'g-his-8a-22', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竷鍗曞厓 浜烘皯瑙ｆ斁鎴樹簤', edition: '缁熺紪鐗?, section: '绗?2璇?娲诲姩璇?鎺㈠绾㈣壊鏂囧寲鐨勫巻鍙插熀鍥?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8a', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '绾㈣壊绮剧璋辩郴', content: '浜曞唸灞辩簿绁炪€侀暱寰佺簿绁炪€佸欢瀹夌簿绁炪€佽タ鏌忓潯绮剧銆? },
      { id: 'kp2', title: '绾㈣壊鏂囧寲浼犳壙', content: '浼犳壙闈╁懡鏂囧寲锛屽潥瀹氱悊鎯充俊蹇点€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '銆屾槦鏄熶箣鐏紝鍙互鐕庡師銆嶈薄寰佺殑闈╁懡绮剧婧愪簬', options: ['鍗楁槍璧蜂箟', '浜曞唸灞辨枟浜?, '闀垮緛', '寤跺畨'], answerIndex: 1, explanation: '绠€鍗曪細浜曞唸灞辩簿绁炪€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓嶆€曡壈闅鹃櫓闃汇€侀潻鍛界悊鎯抽珮浜庡ぉ鎸囩殑鏄?, options: ['浜曞唸灞辩簿绁?, '闀垮緛绮剧', '寤跺畨绮剧', '瑗挎煆鍧＄簿绁?], answerIndex: 1, explanation: '绠€鍗曪細闀垮緛绮剧銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '绾㈣壊鏂囧寲鐨勬牳蹇冩槸', options: ['鑹拌嫤濂嬫枟', '涓浗鍏变骇鍏氶瀵间汉姘戝湪闈╁懡涓垱閫犵殑鍏堣繘鏂囧寲', '鍐涗簨鏂椾簤', '鏍规嵁鍦板缓璁?], answerIndex: 1, explanation: '绠€鍗曪細闈╁懡鏂囧寲涓庨潻鍛界簿绁炪€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '銆屼袱涓姟蹇呫€嶏紙鍔″繀璋﹁櫄璋ㄦ厧銆佸姟蹇呰壈鑻﹀鏂楋級鍑鸿嚜', options: ['涓叡涓冨ぇ', '涓冨眾浜屼腑鍏ㄤ細锛堣タ鏌忓潯锛?, '閬典箟浼氳', '涓叡鍏ぇ'], answerIndex: 1, explanation: '涓瓑锛氳タ鏌忓潯绮剧銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '寤跺畨绮剧鐨勬牳蹇冩槸', options: ['鍏ㄥ績鍏ㄦ剰涓轰汉姘戞湇鍔°€佽嚜鍔涙洿鐢熻壈鑻﹀鏂?, '姝﹁鏂椾簤', '缁熶竴鎴樼嚎', '鍦熷湴闈╁懡'], answerIndex: 0, explanation: '涓瓑锛氬ぇ鐢熶骇杩愬姩涓庢暣椋庤繍鍔ㄣ€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '浠婂ぉ浼犳壙绾㈣壊鏂囧寲鐨勭幇瀹炴剰涔夋槸', options: ['鎭㈠闈╁懡骞翠唬', '姹插彇绮剧鍔涢噺銆佸潥瀹氱悊鎯充俊蹇?, '鍙敤浜庢梾娓?, '鎶靛埗鐜颁唬鏂囨槑'], answerIndex: 1, explanation: '涓瓑锛氫互鍙查壌浠娿€佺珛寰锋爲浜恒€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岀孩绫抽キ锛屽崡鐡滄堡鈥︹€︽湵寰风殑鎵佹媴銆傘€嶈鍙叉枡鍙嶆槧鐨勬槸', options: ['闀垮緛绮剧', '浜曞唸灞辩簿绁?, '寤跺畨绮剧', '鎶楁垬绮剧'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽畼鍏典竴鑷淬€佽壈鑻﹀鏂椼€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓嬪垪绾㈣壊鏁欒偛鍩哄湴涓庡搴旂簿绁炴惌閰嶆纭殑鏄?, options: ['浜曞唸灞扁€斺€旈暱寰佺簿绁?, '寤跺畨鈥斺€斿欢瀹夌簿绁?, '閬典箟鈥斺€旇タ鏌忓潯绮剧', '瑗挎煆鍧♀€斺€斾簳鍐堝北绮剧'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽鍙峰叆搴с€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鎴戜滑鍙傝绾㈣壊閬楀潃銆佷紶鎵跨孩鑹插熀鍥狅紝涓昏鐩殑鏄?, options: ['浼戦棽濞变箰', '閾闈╁懡鍘嗗彶銆佷紶鎵块潻鍛界簿绁?, '瀹屾垚浣滀笟', '鍙戝睍缁忔祹'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀珛寰锋爲浜恒€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏂版皯涓讳富涔夐潻鍛芥椂鏈熷舰鎴愮殑绾㈣壊绮剧锛屽叾鍏卞悓鍐呮牳鏄?, options: ['涓嶆€曠壓鐗层€佷俊蹇靛潥瀹氥€佷緷闈犱汉姘?, '涓汉鑻遍泟涓讳箟', '鍐掗櫓鐩插姩', '鍏抽棬涓讳箟'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀簿绁炰竴鑴夌浉鎵裤€? },
    ],
  },

  {
    id: 'g-his-8b-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 涓崕浜烘皯鍏卞拰鍥芥垚绔嬪拰绀句細涓讳箟鍒跺害寤虹珛', edition: '缁熺紪鐗?, section: '绗?璇?涓崕浜烘皯鍏卞拰鍥芥垚绔?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鏀垮崗涓庡紑鍥藉ぇ鍏?, content: '1949骞存斂鍗忓叡鍚岀翰棰嗭紝10鏈?鏃ュ紑鍥藉ぇ鍏搞€? },
      { id: 'kp2', title: '鎴愮珛鎰忎箟涓庤タ钘忚В鏀?, content: '涓浗浜烘皯绔欒捣鏉ヤ簡锛?951瑗胯棌鍜屽钩瑙ｆ斁銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绗竴灞婁腑鍥戒汉姘戞斂娌诲崗鍟嗕細璁彫寮€浜?, options: ['1945骞?, '1949骞?鏈?, '1949骞?0鏈?, '1954骞?], answerIndex: 1, explanation: '绠€鍗曪細1949骞?鏈堝湪鍖楀钩鍙紑銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '寮€鍥藉ぇ鍏镐妇琛岀殑鏃堕棿鏄?, options: ['1949骞?鏈?鏃?, '1949骞?0鏈?鏃?, '1949骞?鏈?1鏃?, '1950骞?0鏈?鏃?], answerIndex: 1, explanation: '绠€鍗曪細1949骞?0鏈?鏃ャ€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '绁栧浗澶ч檰鑾峰緱缁熶竴銆佸悇鏃忎汉姘戝疄鐜板ぇ鍥㈢粨鐨勬爣蹇楁槸', options: ['鏂颁腑鍥芥垚绔?, '瑗胯棌鍜屽钩瑙ｆ斁', '鎶楃編鎻存湞鑳滃埄', '鍦熷湴鏀归潻瀹屾垚'], answerIndex: 1, explanation: '绠€鍗曪細1951骞磋タ钘忓拰骞宠В鏀俱€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '绗竴灞婃斂鍗忛€氳繃鐨勩€佽捣涓存椂瀹硶浣滅敤鐨勬枃浠舵槸', options: ['銆婁腑鍗庝汉姘戝叡鍜屽浗瀹硶銆?, '銆婁腑鍥戒汉姘戞斂娌诲崗鍟嗕細璁叡鍚岀翰棰嗐€?, '銆婁复鏃剁害娉曘€?, '銆婅鑱斿悎鏀垮簻銆?], answerIndex: 1, explanation: '涓瓑锛氬叡鍚岀翰棰嗕复鏃跺娉曚綔鐢ㄣ€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鏂颁腑鍥介閮芥槸', options: ['鍗椾含', '鍖椾含', '瑗垮畨', '閲嶅簡'], answerIndex: 1, explanation: '涓瓑锛氬寳骞虫敼鍚嶅寳浜负棣栭兘銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '瑗胯棌鍜屽钩瑙ｆ斁浜?, options: ['1949骞?, '1951骞?, '1959骞?, '1965骞?], answerIndex: 1, explanation: '涓瓑锛?951骞磋タ钘忓拰骞宠В鏀俱€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岃浣嶄唬琛ㄥ厛鐢熶滑锛屾垜浠湁涓€涓叡鍚岀殑鎰熻锛岃繖灏辨槸鎴戜滑鐨勫伐浣滃皢鍐欏湪浜虹被鐨勫巻鍙蹭笂鈥︹€︺€嶆瘺娉戒笢杩欐璇濆嚭鑷?, options: ['涓叡涓冨ぇ', '绗竴灞婃斂鍗忓紑骞曡瘝', '寮€鍥藉ぇ鍏?, '涓叡鍏ぇ'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾斂鍗忓彫寮€銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓崕浜烘皯鍏卞拰鍥芥垚绔嬬殑浼熷ぇ鎰忎箟鏄?, options: ['缁撴潫浜嗕袱鍗冨骞村笣鍒?, '涓浗鐪熸鎴愪负鐙珛鑷富鍥藉锛屼腑鍥戒汉姘戜粠姝ょ珯璧锋潵浜?, '瀹炵幇浜嗗伐涓氬寲', '寤虹珛浜嗙ぞ浼氫富涔夊埗搴?], answerIndex: 1, explanation: '鐪熼锛氬紑杈熶簡涓浗鍘嗗彶鏂扮邯鍏冦€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏂颁腑鍥芥垚绔嬩笌杈涗亥闈╁懡锛屾柊涓浗鎴愮珛鐨勬柊鍙戝睍鍦ㄤ簬', options: ['鎺ㄧ炕浜嗗悰涓讳笓鍒?, '瀹炵幇浜嗘皯鏃忕嫭绔嬪拰浜烘皯褰撳浣滀富', '寤虹珛浜嗗叡鍜屾斂浣?, '棰佸竷浜嗗娉?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽交搴曟敼鍙樼ぞ浼氭€ц川銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級瑗胯棌鍜屽钩瑙ｆ斁鐨勯噸瑕佹剰涔夋槸', options: ['瀹屾垚浜嗗湡鍦版敼闈?, '绁栧浗澶ч檰鑾峰緱缁熶竴', '瀹炵幇浜嗘皯涓绘敼闈?, '寤虹珛浜嗚嚜娌诲尯'], answerIndex: 1, explanation: '鐪熼锛氭爣蹇楃鍥藉ぇ闄嗙粺涓€銆? },
    ],
  },

  {
    id: 'g-his-8b-2', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 涓崕浜烘皯鍏卞拰鍥芥垚绔嬪拰绀句細涓讳箟鍒跺害寤虹珛', edition: '缁熺紪鐗?, section: '绗?璇?宸╁浐浜烘皯姘戜富鏀挎潈',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鎶楃編鎻存湞', content: '1950鈥?953骞达紝褰痉鎬€鐜囧啗锛屾彁楂樺浗闄呭湴浣嶃€? },
      { id: 'kp2', title: '鍦熷湴鏀归潻', content: '1950鈥?952骞村簾闄ゅ皝寤哄湡鍦板埗搴︺€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓浗浜烘皯蹇楁効鍐涘徃浠ゅ憳鏄?, options: ['鏋楀姜', '褰痉鎬€', '闄堟瘏', '璐洪緳'], answerIndex: 1, explanation: '绠€鍗曪細褰痉鎬€浠诲徃浠ゅ憳銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鎶楃編鎻存湞鎴樹簤鍘嗘椂绾?, options: ['1骞?, '3骞?, '5骞?, '8骞?], answerIndex: 1, explanation: '绠€鍗曪細1950鈥?953骞淬€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鎸囧鍦熷湴鏀归潻鐨勬硶寰嬫枃浠舵槸', options: ['銆婂叡鍚岀翰棰嗐€?, '銆婁腑鍗庝汉姘戝叡鍜屽浗鍦熷湴鏀归潻娉曘€?, '銆婁腑鍗庝汉姘戝叡鍜屽浗瀹硶銆?, '銆婂ぉ鏈濈敯浜╁埗搴︺€?], answerIndex: 1, explanation: '绠€鍗曪細1950骞撮甯冨湡鍦版敼闈╂硶銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鎶楃編鎻存湞涓垗韬牭鏋溂鐨勮嫳闆勬槸', options: ['榛勭户鍏?, '閭卞皯浜?, '钁ｅ瓨鐟?, '闆烽攱'], answerIndex: 0, explanation: '涓瓑锛氶粍缁у厜鐗虹壊浜庝笂鐢樺箔銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓烘綔浼忎换鍔¤鐏悶鍣€屼弗瀹堢邯寰嬬殑鑻遍泟鏄?, options: ['榛勭户鍏?, '閭卞皯浜?, '缃楃洓鏁?, '鏉ㄦ牴鎬?], answerIndex: 1, explanation: '涓瓑锛氶偙灏戜簯銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍦熷湴鏀归潻鍩烘湰瀹屾垚浜?, options: ['1950骞?, '1952骞村簳', '1956骞?, '1958骞?], answerIndex: 1, explanation: '涓瓑锛?952骞村簳鍩烘湰瀹屾垚銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岃タ鏂逛镜鐣ヨ€呭嚑鐧惧勾鏉ュ彧瑕佸湪涓滄柟涓€涓捣宀镐笂鏋惰捣鍑犲皧澶х偖灏卞彲闇稿崰涓€涓浗瀹剁殑鏃朵唬鏄竴鍘讳笉澶嶈繑浜嗐€傘€嶆璇濊瘎浠风殑鏄?, options: ['鎶楁棩鎴樹簤鑳滃埄', '鎶楃編鎻存湞鑳滃埄', '瑙ｆ斁鎴樹簤鑳滃埄', '鏂颁腑鍥芥垚绔?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾姉缇庢彺鏈濇彁楂樹簡鍥介檯鍦颁綅銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍦熷湴鏀归潻鐨勫畬鎴愶紝褰诲簳鎽ф瘉浜?, options: ['灏佸缓甯濆埗', '灏佸缓鍦熷湴鍒跺害', '璧勬湰涓讳箟鍓ュ墛', '娈栨皯缁熸不'], answerIndex: 1, explanation: '鐪熼锛氬啘姘戞垚涓哄湡鍦扮殑涓讳汉銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎶楃編鎻存湞鎴樹簤鑳滃埄鐨勫浗闄呮剰涔夋槸', options: ['瀹屾垚浜嗗浗瀹剁粺涓€', '澶уぇ鎻愰珮浜嗘垜鍥界殑鍥介檯鍦颁綅', '瀹炵幇浜嗗伐涓氬寲', '鎭㈠浜嗚仈鍚堝浗甯綅'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾墦鐮寸編鍐涗笉鍙垬鑳滅璇濄€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍦熷湴鏀归潻涓庡搴仈浜ф壙鍖呰矗浠诲埗锛岀浉鍚屼綔鐢ㄦ槸', options: ['閮界‘绔嬪湡鍦板叕鏈?, '閮借皟鍔ㄤ簡鍐滄皯鐢熶骇绉瀬鎬?, '閮藉缓绔嬩簡浜烘皯鍏ぞ', '閮藉簾闄や簡鍦熷湴绉佹湁'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃В鏀惧啘鏉戠敓浜у姏銆? },
    ],
  },

  {
    id: 'g-his-8b-3', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 涓崕浜烘皯鍏卞拰鍥芥垚绔嬪拰绀句細涓讳箟鍒跺害寤虹珛', edition: '缁熺紪鐗?, section: '绗?璇?绀句細涓讳箟鍒跺害寤虹珛',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓€浜旇鍒掍笌瀹硶', content: '1953鈥?957浼樺厛鍙戝睍閲嶅伐涓氾紝1954骞村娉曘€? },
      { id: 'kp2', title: '涓夊ぇ鏀归€?, content: '1956骞村畬鎴愶紝绀句細涓讳箟鍒跺害寤虹珛銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绗竴涓簲骞磋鍒掗泦涓富瑕佸姏閲忓彂灞?, options: ['鍐滀笟', '杞诲伐涓?, '閲嶅伐涓?, '鍟嗕笟'], answerIndex: 2, explanation: '绠€鍗曪細涓€浜旇鍒掍紭鍏堝彂灞曢噸宸ヤ笟銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鎴戝浗绗竴閮ㄧぞ浼氫富涔夌被鍨嬬殑瀹硶棰佸竷浜?, options: ['1949骞?, '1954骞?, '1956骞?, '1982骞?], answerIndex: 1, explanation: '绠€鍗曪細1954骞寸涓€灞婂叏鍥戒汉澶с€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鎴戝浗杩涘叆绀句細涓讳箟鍒濈骇闃舵鐨勬爣蹇楁槸', options: ['鏂颁腑鍥芥垚绔?, '鍦熷湴鏀归潻瀹屾垚', '涓夊ぇ鏀归€犲熀鏈畬鎴?, '涓€浜旇鍒掑畬鎴?], answerIndex: 2, explanation: '绠€鍗曪細1956骞翠笁澶ф敼閫犲畬鎴愩€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '涓€浜旇鍒掓湡闂村缓鎴愮殑姹借溅鍒堕€犲巶鏄?, options: ['绗竴姹借溅鍒堕€犲巶锛堥暱鏄ワ級', '绗簩姹借溅鍒堕€犲巶', '涓婃捣姹借溅鍘?, '鍖椾含姹借溅鍘?], answerIndex: 0, explanation: '涓瓑锛氶暱鏄ヤ竴姹姐€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍥藉瀵硅祫鏈富涔夊伐鍟嗕笟鏀归€犵殑涓昏鏂瑰紡鏄?, options: ['娌℃敹', '鍏鍚堣惀', '寤虹珛鍚堜綔绀?, '绉佹湁鍖?], answerIndex: 1, explanation: '涓瓑锛氬叕绉佸悎钀ャ€佸拰骞宠祹涔般€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍥藉瀵瑰啘涓氥€佹墜宸ヤ笟鏀归€犵殑鏂瑰紡鏄?, options: ['鍏鍚堣惀', '寤虹珛鐢熶骇鍚堜綔绀?, '鍦熷湴绉佹湁', '瀹跺涵鎵垮寘'], answerIndex: 1, explanation: '涓瓑锛氬啘涓氭墜宸ヤ笟鍚堜綔鍖栥€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽埌1956骞村簳锛屽浗瀹跺熀鏈笂瀹屾垚浜嗗鍐滀笟銆佹墜宸ヤ笟鍜岃祫鏈富涔夊伐鍟嗕笟鐨勭ぞ浼氫富涔夋敼閫犮€傘€嶈鏉愭枡璇存槑', options: ['瀹炵幇浜嗗伐涓氬寲', '绀句細涓讳箟鍩烘湰鍒跺害鍦ㄦ垜鍥藉缓绔嬭捣鏉?, '鍦熷湴鏀归潻瀹屾垚', '鏀归潻寮€鏀惧紑濮?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃繘鍏ョぞ浼氫富涔夊垵绾ч樁娈点€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級1954骞淬€婁腑鍗庝汉姘戝叡鍜屽浗瀹硶銆嬬殑鎬ц川鏄?, options: ['涓存椂瀹硶', '绗竴閮ㄧぞ浼氫富涔夌被鍨嬬殑瀹硶', '璧勪骇闃剁骇瀹硶', '鏂版皯涓讳富涔夊娉?], answerIndex: 1, explanation: '鐪熼锛氭垜鍥界涓€閮ㄧぞ浼氫富涔夌被鍨嬪娉曘€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓€浜旇鍒掕秴棰濆畬鎴愶紝璇存槑鎴戝浗', options: ['瀹炵幇浜嗗伐涓氬寲', '寮€濮嬫敼鍙樺伐涓氳惤鍚庨潰璨岋紝鍚戠ぞ浼氫富涔夊伐涓氬寲杩堣繘', '寤烘垚浜嗗伐涓氬浗', '鍐滀笟瀹炵幇浜嗘満姊板寲'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽瀹氬伐涓氬寲鍒濇鍩虹銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓夊ぇ鏀归€犵殑瀹炶川鏄?, options: ['搴熼櫎灏佸缓鍓ュ墛', '鐢熶骇璧勬枡绉佹湁鍒惰浆鍙樹负绀句細涓讳箟鍏湁鍒?, '鍙戝睍鐢熶骇鍔?, '瀹炶璁″垝缁忔祹'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾墍鏈夊埗娣卞埢鍙橀潻銆? },
    ],
  },

  {
    id: 'g-his-8b-4', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 涓崕浜烘皯鍏卞拰鍥芥垚绔嬪拰绀句細涓讳箟鍒跺害寤虹珛', edition: '缁熺紪鐗?, section: '绗?璇?鐙珛鑷富鐨勫拰骞冲浜?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍜屽钩鍏卞浜旈」鍘熷垯', content: '1953骞村懆鎭╂潵鎻愬嚭锛屾垚涓哄鐞嗗浗涓庡浗鍏崇郴鍩烘湰鍑嗗垯銆? },
      { id: 'kp2', title: '涓囬殕浼氳', content: '1955骞存眰鍚屽瓨寮傦紝淇冭繘浜氶潪鍥㈢粨銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍜屽钩鍏卞浜旈」鍘熷垯鐨勬彁鍑鸿€呮槸', options: ['姣涙辰涓?, '鍛ㄦ仼鏉?, '鍒樺皯濂?, '閭撳皬骞?], answerIndex: 1, explanation: '绠€鍗曪細鍛ㄦ仼鏉?953骞存彁鍑恒€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '绗竴娆℃病鏈夋畺姘戜富涔夊浗瀹跺弬鍔犵殑浜氶潪浼氳鏄?, options: ['鏃ュ唴鐡︿細璁?, '涓囬殕浼氳', 'APEC浼氳', '鑱斿悎鍥藉ぇ浼?], answerIndex: 1, explanation: '绠€鍗曪細1955骞翠竾闅嗕細璁€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鍜屽钩鍏卞浜旈」鍘熷垯涓嶅寘鎷?, options: ['浜掔浉灏婇噸涓绘潈鍜岄鍦熷畬鏁?, '浜掍笉渚电姱', '浜掍笉骞叉秹鍐呮斂', '骞崇瓑缁撶洘'], answerIndex: 3, explanation: '绠€鍗曪細搴斾负骞崇瓑浜掑埄銆佸拰骞冲叡澶勩€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍦ㄤ竾闅嗕細璁笂锛屽懆鎭╂潵鎻愬嚭鐨勬柟閽堟槸', options: ['涓€杈瑰€?, '姹傚悓瀛樺紓', '鍙﹁捣鐐夌伓', '鎵撴壂骞插噣灞嬪瓙鍐嶈瀹?], answerIndex: 1, explanation: '涓瓑锛氭眰鍚屽瓨寮傛帹鍔ㄤ細璁垚鍔熴€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鍜屽钩鍏卞浜旈」鍘熷垯鎴愪负澶勭悊鍥戒笌鍥戒箣闂村叧绯荤殑', options: ['涓存椂鎺柦', '鍩烘湰鍑嗗垯', '鏉冨疁涔嬭', '鍞竴鏍囧噯'], answerIndex: 1, explanation: '涓瓑锛氬浗闄呭奖鍝嶆繁杩溿€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鏂颁腑鍥芥垚绔嬪垵鏈熷琛岀殑澶栦氦鏀跨瓥鏄?, options: ['闂叧閿佸浗', '鐙珛鑷富鐨勫拰骞冲浜?, '涓€杈瑰€掑悜缇庡浗', '涓珛鑷繚'], answerIndex: 1, explanation: '涓瓑锛氱嫭绔嬭嚜涓诲拰骞冲浜ゃ€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼腑鍥戒唬琛ㄥ洟鏄潵姹傚洟缁撹€屼笉鏄潵鍚垫灦鐨勨€︹€︽槸鏉ユ眰鍚岃€屼笉鏄潵绔嬪紓鐨勩€傘€嶈繖娈佃瘽鍑鸿嚜', options: ['鍛ㄦ仼鏉ュ湪涓囬殕浼氳', '姣涙辰涓滃湪寮€鍥藉ぇ鍏?, '閭撳皬骞冲湪鑱斿ぇ', '闄堟瘏鍦ㄦ棩鍐呯摝'], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾眰鍚屽瓨寮傘€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍜屽钩鍏卞浜旈」鍘熷垯鐨勯噸瑕佹剰涔夋槸', options: ['鎵撶牬澶栦氦瀛ょ珛', '鎴愪负澶勭悊鍥戒笌鍥戒箣闂村叧绯荤殑鍩烘湰鍑嗗垯', '鎭㈠鑱斿悎鍥藉腑浣?, '瀹炵幇涓編寤轰氦'], answerIndex: 1, explanation: '鐪熼锛氭爣蹇楁柊涓浗澶栦氦鎴愮啛銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓囬殕浼氳鎵€浣撶幇鐨勭簿绁炲悗鏉ヨ绉颁负', options: ['涓囬殕绮剧', '濂ヨ繍绮剧', 'APEC绮剧', '鏃ュ唴鐡︾簿绁?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼簹闈炲洟缁撱€佹眰鍚屽瓨寮傘€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏂颁腑鍥藉浜や笌鏃т腑鍥藉浜わ紝鏈川涓嶅悓鏄?, options: ['鏄惁鍔犲叆鍥介檯缁勭粐', '鏄惁鐙珛鑷富銆佺淮鎶ゅ浗瀹朵富鏉?, '鏄惁涓庤嫃鑱斿缓浜?, '鏄惁鍙傚姞浼氳'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾棫涓浗灞堣颈澶栦氦銆? },
    ],
  },

  {
    id: 'g-his-8b-5', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 绀句細涓讳箟寤鸿閬撹矾鐨勬帰绱?, edition: '缁熺紪鐗?, section: '绗?璇?鑹拌緵鎺㈢储涓庢洸鎶樺彂灞?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡鍏ぇ涓庢€昏矾绾?, content: '1956鍏ぇ鑹ソ寮€绔紝1958鎬昏矾绾裤€? },
      { id: 'kp2', title: '澶ц穬杩涖€佷汉姘戝叕绀句笌鏂囬潻', content: '宸﹀€惧け璇紝1966鈥?976鏂囧寲澶ч潻鍛姐€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎺㈢储寤鸿绀句細涓讳箟閬撹矾鐨勮壇濂藉紑绔槸', options: ['涓叡涓冨ぇ', '涓叡鍏ぇ', '涓叡鍗佷簩澶?, '涓叡鍗佷簲澶?], answerIndex: 1, explanation: '绠€鍗曪細1956骞翠腑鍏卞叓澶с€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '1958骞村紑濮嬬殑澶辫涓昏琛ㄧ幇涓?, options: ['澶ц穬杩涘拰浜烘皯鍏ぞ鍖栬繍鍔?, '鍦熷湴鏀归潻', '涓夊ぇ鏀归€?, '鏀归潻寮€鏀?], answerIndex: 0, explanation: '绠€鍗曪細鎬ヤ簬姹傛垚銆佸拷瑙嗗瑙傝寰嬨€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '缁欏厷鍜屽浗瀹跺甫鏉ヤ弗閲嶇伨闅剧殑鍗佸勾鍐呬贡鏄?, options: ['涓夊勾鑷劧鐏惧', '鏂囧寲澶ч潻鍛?, '瑙ｆ斁鎴樹簤', '鎶楃編鎻存湞'], answerIndex: 1, explanation: '绠€鍗曪細1966鈥?976骞淬€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '涓叡鍏ぇ鎸囧嚭锛屽綋鏃跺厷鍜屼汉姘戠殑涓昏浠诲姟鏄?, options: ['浠ラ樁绾ф枟浜変负绾?, '闆嗕腑鍔涢噺鍙戝睍绀句細鐢熶骇鍔?, '杩涜涓夊ぇ鏀归€?, '鍙戝姩缇や紬杩愬姩'], answerIndex: 1, explanation: '涓瓑锛氶泦涓姏閲忓彂灞曠敓浜у姏銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '澶ц穬杩涘拰浜烘皯鍏ぞ鍖栬繍鍔ㄧ殑涓昏閿欒鍦ㄤ簬', options: ['杩濊儗浜嗗瑙傜粡娴庤寰嬨€佹€ヤ簬姹傛垚', '鍙戝睍澶參', '杩囧垎閲嶈鍐滀笟', '鑴辩浜嗗啘姘?], answerIndex: 0, explanation: '涓瓑锛氭€ヤ簬姹傛垚銆佸じ澶т汉鐨勪富瑙傝兘鍔ㄦ€с€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鏂囧寲澶ч潻鍛界粨鏉熺殑鏍囧織鏄?, options: ['浜斾竴鍏€氱煡', '绮夌姹熼潚鍙嶉潻鍛介泦鍥?, '涓叡鍏ぇ', '鍗佷竴灞婁笁涓叏浼?], answerIndex: 1, explanation: '涓瓑锛?976骞寸矇纰庡洓浜哄府銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岃偉鐚禌澶ц薄锛屽氨鏄蓟瀛愮煭锛屽叏绀炬潃涓€鍙ｏ紝瓒冲鍚冨崐骞淬€傘€嶈椤哄彛婧滃弽鏄犵殑鏄?, options: ['鍦熷湴鏀归潻', '澶ц穬杩涙诞澶搁', '鍐滀笟鍚堜綔鍖?, '瀹跺涵鑱斾骇鎵垮寘'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾诞澶搁鐩涜銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級澶ц穬杩涘拰浜烘皯鍏ぞ鍖栬繍鍔ㄧ暀缁欐垜浠殑鏁欒鏄?, options: ['瑕佸姞蹇€熷害', '缁忔祹寤鸿瑕佷粠鍥芥儏鍑哄彂銆侀伒寰瑙傝寰?, '瑕佷竴澶т簩鍏?, '瑕佷笉鏂彉闈╃敓浜у叧绯?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽疄浜嬫眰鏄€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓叡鍏ぇ鏄帰绱㈠缓璁剧ぞ浼氫富涔夐亾璺壇濂藉紑绔紝鍥犱负瀹?, options: ['鎻愬嚭浜嗘€昏矾绾?, '姝ｇ‘鍒嗘瀽浜嗗浗鍐呬富瑕佺煕鐩?, '鍙戝姩浜嗗ぇ璺冭繘', '缁撴潫浜嗘枃闈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀鍚堝浗鎯呯殑姝ｇ‘鍒ゆ柇銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏂囧寲澶ч潻鍛藉甫缁欐垜浠殑娣卞埢鏁欒鏄?, options: ['瑕佷互闃剁骇鏂椾簤涓虹翰', '蹇呴』鍔犲己绀句細涓讳箟姘戜富涓庢硶鍒跺缓璁?, '瑕佷釜浜哄磭鎷?, '瑕佷笉鏂彂鍔ㄨ繍鍔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾皯涓绘硶鍒堕伃鐮村潖銆? },
    ],
  },

  {
    id: 'g-his-8b-6', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 绀句細涓讳箟寤鸿閬撹矾鐨勬帰绱?, edition: '缁熺紪鐗?, section: '绗?璇?绀句細涓讳箟寤鸿鐨勫法澶ф垚灏卞拰鍏堥攱妯¤寖',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '寤鸿鎴愬氨', content: '姝︽眽鍖呭ご閽㈤搧銆佸ぇ搴嗘补鐢扮瓑寤烘垚銆? },
      { id: 'kp2', title: '妯¤寖浜虹墿', content: '鐜嬭繘鍠溿€佺劍瑁曠銆侀浄閿嬨€侀倱绋煎厛銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp2', prompt: '璧㈠緱閾佷汉绉板彿鐨勭煶娌瑰伐浜烘槸', options: ['鐜嬭繘鍠?, '鐒﹁绂?, '闆烽攱', '閭撶鍏?], answerIndex: 0, explanation: '绠€鍗曪細鐜嬭繘鍠滃ぇ搴嗙煶娌逛細鎴樸€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鍘垮涔﹁鐨勫ソ姒滄牱鏄?, options: ['鐜嬭繘鍠?, '鐒﹁绂?, '闆烽攱', '瀛旂箒妫?], answerIndex: 1, explanation: '绠€鍗曪細鐒﹁绂勫叞鑰冩不娌欍€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '瑙ｆ斁鍐涘ソ鎴樺＋鏄?, options: ['榛勭户鍏?, '闆烽攱', '閭卞皯浜?, '钁ｅ瓨鐟?], answerIndex: 1, explanation: '绠€鍗曪細闆烽攱鍏ㄥ績鍏ㄦ剰涓轰汉姘戞湇鍔°€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鎴戝浗瀹炵幇鍘熸补鍏ㄩ儴鑷粰銆佺粨鏉熸磱娌规椂浠ｇ殑娌圭敯鏄?, options: ['鑳滃埄娌圭敯', '澶у簡娌圭敯', '鍗庡寳娌圭敯', '鍏嬫媺鐜涗緷娌圭敯'], answerIndex: 1, explanation: '涓瓑锛氬ぇ搴嗘补鐢般€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '琚獕涓轰袱寮瑰厓鍕嬬殑绉戝瀹舵槸', options: ['閽卞妫?, '閭撶鍏?, '琚侀殕骞?, '灞犲懄鍛?], answerIndex: 1, explanation: '涓瓑锛氶倱绋煎厛涓烘牳姝﹀櫒鐮斿埗浣滃嚭璐＄尞銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鍏ㄩ潰寤鸿绀句細涓讳箟鏃舵湡寤烘垚鐨勯挗閾佸熀鍦板寘鎷?, options: ['闉嶅北銆佸疂灞?, '姝︽眽銆佸寘澶?, '棣栭挗銆佸疂閽?, '鏀€鏋濊姳銆侀┈闉嶅北'], answerIndex: 1, explanation: '涓瓑锛氭姹夊寘澶翠袱澶ч挗閾佸熀鍦般€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾垜鏄叞鑰冨幙濮斾功璁帮紝涓嶆妸鑰佺櫨濮撶殑浜嬪姙濂斤紝鎴戝涓嶈捣浠栦滑銆傘€嶈繖浣撶幇浜嗙劍瑁曠', options: ['閾佷汉绮剧', '鍏ㄥ績鍏ㄦ剰涓轰汉姘戞湇鍔°€佽壈鑻﹀垱涓?, '涓ゅ脊涓€鏄熺簿绁?, '鑸ぉ绮剧'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃壈鑻﹀鏂椼€佷负姘戝鐚€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍏ㄩ潰寤鸿绀句細涓讳箟鏃舵湡锛屾垜鍥藉彇寰楃殑閲嶅ぇ鎴愬氨鏄?, options: ['鍔犲叆涓栬锤缁勭粐', '澶у簡娌圭敯寤烘垚銆佸疄鐜板師娌硅嚜缁?, '棣欐腐鍥炲綊', '涓惧姙濂ヨ繍浼?], answerIndex: 1, explanation: '鐪熼锛氬垵姝ュ舰鎴愮嫭绔嬪伐涓氫綋绯汇€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鐜嬭繘鍠溿€佺劍瑁曠銆侀浄閿嬬瓑妯¤寖浜虹墿锛屽叡鍚屼綋鐜扮殑鏃朵唬绮剧鏄?, options: ['鏀归潻寮€鏀俱€佸紑鎷撳垱鏂?, '鑹拌嫤鍒涗笟銆佸叏蹇冨叏鎰忎负浜烘皯鏈嶅姟', '淇濆鍗浗銆佷笉鎬曠壓鐗?, '鏁负浜哄厛銆佽拷姹傝储瀵?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃壈鑻﹀垱涓氬勾浠ｃ€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓ゅ脊涓€鏄熺簿绁炰腑鐨勪袱寮规槸鎸?, options: ['鍘熷瓙寮广€佹阿寮?, '鍘熷瓙寮瑰拰瀵煎脊', '姘㈠脊銆佷汉閫犲崼鏄?, '鏍稿脊銆佸寮?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄倱绋煎厛璐＄尞銆? },
    ],
  },

  {
    id: 'g-his-8b-7', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 绀句細涓讳箟寤鸿閬撹矾鐨勬帰绱?, edition: '缁熺紪鐗?, section: '绗?璇?鍥介槻鐜颁唬鍖栬捣姝ュ拰澶栦氦宸ヤ綔鏂扮獊鐮?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍥介槻涓庣鎶€', content: '1964鍘熷瓙寮广€?966瀵煎脊銆?967姘㈠脊銆? },
      { id: 'kp2', title: '澶栦氦绐佺牬', content: '1971鎭㈠鑱斿悎鍥藉腑浣嶏紝1979涓編寤轰氦銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎴戝浗绗竴棰楀師瀛愬脊鐖嗙偢鎴愬姛浜?, options: ['1960骞?, '1964骞?, '1967骞?, '1970骞?], answerIndex: 1, explanation: '绠€鍗曪細1964骞寸涓€棰楀師瀛愬脊銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '涓崕浜烘皯鍏卞拰鍥芥仮澶嶅湪鑱斿悎鍥藉悎娉曞腑浣嶆槸鍦?, options: ['1949骞?, '1971骞?, '1972骞?, '1979骞?], answerIndex: 1, explanation: '绠€鍗曪細1971骞寸26灞婅仈澶с€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓編姝ｅ紡寤虹珛澶栦氦鍏崇郴鏄湪', options: ['1971骞?, '1972骞?, '1979骞?, '1978骞?], answerIndex: 2, explanation: '绠€鍗曪細1979骞?鏈?鏃ヤ腑缇庡缓浜ゃ€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '1972骞磋鍗庛€佷腑缇庡弻鏂圭缃层€婅仈鍚堝叕鎶ャ€嬬殑缇庡浗鎬荤粺鏄?, options: ['灏煎厠鏉?, '绂忕壒', '鍗＄壒', '閲屾牴'], answerIndex: 0, explanation: '涓瓑锛氬凹鍏嬫澗璁垮崕銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓浗缁勫缓绗簩鐐叺閮ㄩ槦锛堝悗鏀圭О鐏鍐涳級鏄湪', options: ['1949骞?, '1956骞?, '1966骞?, '1979骞?], answerIndex: 2, explanation: '涓瓑锛?966骞寸粍寤恒€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓棩姝ｅ紡寤虹珛澶栦氦鍏崇郴鏄湪', options: ['1971骞?, '1972骞?, '1979骞?, '1978骞?], answerIndex: 1, explanation: '涓瓑锛?972骞寸敯涓鑽ｈ鍗庡悗寤轰氦銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岃繖鏄竴涓紓浜殑澶栦氦浜嬩欢鈥︹€︾編鍥芥妸涓浗纭媺杩涜仈鍚堝浗銆傘€嶈浜嬩欢鏄?, options: ['涓囬殕浼氳', '涓浗鎭㈠鑱斿悎鍥藉悎娉曞腑浣?, '涓編寤轰氦', 'APEC浼氳'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛?971骞寸26灞婅仈澶с€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗绗竴棰楀師瀛愬脊鐖嗙偢鎴愬姛鐨勬剰涔夋槸', options: ['瀹炵幇浜嗗伐涓氬寲', '鎵撶牬浜嗗綋鏃舵湁鏍稿ぇ鍥界殑鏍稿瀯鏂€佸寮轰簡鍥介槻瀹炲姏', '缁撴潫浜嗘磱娌规椂浠?, '鎭㈠浜嗚仈鍚堝浗甯綅'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾彁楂樺浗闃插湴浣嶃€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級20涓栫邯70骞翠唬涓浗澶栦氦鏂板眬闈㈠寘鎷?, options: ['鎻愬嚭鍜屽钩鍏卞浜旈」鍘熷垯', '鎭㈠鑱斿悎鍥藉腑浣嶃€佷腑缇庡缓浜ゃ€佷腑鏃ュ缓浜?, '鍔犲叆涓栬锤缁勭粐', '涓惧姙APEC'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽浜ら噸澶х獊鐮淬€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝1972骞村凹鍏嬫澗璁垮崕涓?979骞翠腑缇庡缓浜わ紝鍓嶈€?, options: ['瀹炵幇浜嗗叧绯绘甯稿寲', '鏍囧織涓編姝ｅ紡寤轰氦', '鍙戣〃銆婂缓浜ゅ叕鎶ャ€?, '瀹炵幇浜嗗啗浜嬪悓鐩?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叧绯诲紑濮嬭蛋鍚戞甯稿寲銆? },
    ],
  },

  {
    id: 'g-his-8b-8', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏀归潻寮€鏀句笌涓浗鐗硅壊绀句細涓讳箟鐨勫紑鍒?, edition: '缁熺紪鐗?, section: '绗?璇?浼熷ぇ鐨勫巻鍙茶浆鎶?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鐪熺悊鏍囧噯澶ц璁?, content: '1978骞磋В鏀炬€濇兂锛屼负鍏ㄤ細濂犲熀銆? },
      { id: 'kp2', title: '鍗佷竴灞婁笁涓叏浼?, content: '1978骞?2鏈堬紝浼熷ぇ杞姌锛屾敼闈╁紑鏀俱€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1978骞达紝閽堝涓や釜鍑℃槸鐨勬€濇兂瑙ｆ斁杩愬姩鏄?, options: ['鏂版枃鍖栬繍鍔?, '鍏充簬鐪熺悊鏍囧噯闂鐨勫ぇ璁ㄨ', '鏁撮杩愬姩', '鍙嶅彸鏂椾簤'], answerIndex: 1, explanation: '绠€鍗曪細瀹炶返鏄楠岀湡鐞嗗敮涓€鏍囧噯銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '涓叡鍗佷竴灞婁笁涓叏浼氬彫寮€浜?, options: ['1976骞?, '1978骞?2鏈?, '1979骞?, '1982骞?], answerIndex: 1, explanation: '绠€鍗曪細1978骞?2鏈堛€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍗佷竴灞婁笁涓叏浼氱‘绔嬬殑鎸囧鏂归拡鏄?, options: ['浠ラ樁绾ф枟浜変负绾?, '瑙ｆ斁鎬濇兂銆佸疄浜嬫眰鏄?, '涓や釜鍑℃槸', '澶氬揩濂界渷'], answerIndex: 1, explanation: '绠€鍗曪細瑙ｆ斁鎬濇兂銆佸疄浜嬫眰鏄€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍗佷竴灞婁笁涓叏浼氫綔鍑虹殑浼熷ぇ鍐崇瓥鏄?, options: ['鍙戝姩鏂囧寲澶ч潻鍛?, '鎶婂厷鍜屽浗瀹跺伐浣滀腑蹇冭浆绉诲埌缁忔祹寤鸿涓婃潵銆佸疄琛屾敼闈╁紑鏀?, '杩涜涓夊ぇ鏀归€?, '寤虹珛浜烘皯鍏ぞ'], answerIndex: 1, explanation: '涓瓑锛氫互缁忔祹寤鸿涓轰腑蹇冦€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍗佷竴灞婁笁涓叏浼氬疄闄呬笂褰㈡垚鐨勯瀵兼牳蹇冩槸', options: ['姣涙辰涓?, '閭撳皬骞?, '姹熸辰姘?, '鑳￠敠娑?], answerIndex: 1, explanation: '涓瓑锛氫互閭撳皬骞充负鏍稿績銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鐪熺悊鏍囧噯闂澶ц璁洪鍏堝垔鐧婚噸瑕佹枃绔犵殑鍏氭姤鏄?, options: ['銆婁汉姘戞棩鎶ャ€?, '銆婂厜鏄庢棩鎶ャ€?, '銆婅В鏀惧啗鎶ャ€?, '銆婄孩鏃椼€嬫潅蹇?], answerIndex: 1, explanation: '涓瓑锛氥€婂疄璺垫槸妫€楠岀湡鐞嗙殑鍞竴鏍囧噯銆嬨€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岃繖娆′細璁噸鏂扮‘绔嬩簡椹厠鎬濅富涔夌殑鎬濇兂璺嚎銆佹斂娌昏矾绾垮拰缁勭粐璺嚎鈥︹€︺€嶈浼氳鏄?, options: ['涓叡鍏ぇ', '鍗佷竴灞婁笁涓叏浼?, '涓叡鍗佷簩澶?, '涓叡鍗佷簲澶?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼紵澶у巻鍙茶浆鎶樸€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍗佷竴灞婁笁涓叏浼氭槸鏂颁腑鍥芥垚绔嬩互鏉ュ厷鐨勫巻鍙蹭笂鐨勪紵澶ц浆鎶橈紝鍥犱负瀹?, options: ['缁撴潫浜嗘枃闈?, '鎶婂伐浣滀腑蹇冭浆绉诲埌缁忔祹寤鸿銆佸疄琛屾敼闈╁紑鏀?, '纭珛浜嗘瘺娉戒笢鎬濇兂', '鎭㈠浜嗚仈鍚堝浗甯綅'], answerIndex: 1, explanation: '鐪熼锛氬紑鍚敼闈╁紑鏀惧巻鍙叉柊鏃舵湡銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝閬典箟浼氳涓庡崄涓€灞婁笁涓叏浼氾紝浜岃€呭叡鍚岀偣鏄?, options: ['閮藉彂鐢熷湪闀垮緛涓?, '閮芥槸鍏氱殑鍘嗗彶涓婂叿鏈夎浆鎶樻剰涔夌殑浼氳', '閮界‘绔嬩簡姣涙辰涓滈瀵?, '閮藉湪鏂囬潻鍚?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃浆鎶樼偣浼氳銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍏充簬鐪熺悊鏍囧噯闂澶ц璁虹殑鏈€閲嶈浣滅敤鏄?, options: ['缁撴潫浜嗘枃闈?, '瑙ｆ斁浜嗕汉浠€濇兂锛屼负鍗佷竴灞婁笁涓叏浼氬瀹氭€濇兂鍩虹', '鎵瑰垽浜嗛倱灏忓钩', '瀹炵幇浜嗗伐浣滈噸蹇冭浆绉?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾€濇兂鍏堝銆? },
    ],
  },

  {
    id: 'g-his-8b-9', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏀归潻寮€鏀句笌涓浗鐗硅壊绀句細涓讳箟鐨勫紑鍒?, edition: '缁熺紪鐗?, section: '绗?璇?鏀归潻寮€鏀剧殑璧锋',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍐滄潙鏀归潻', content: '瀹跺涵鑱斾骇鎵垮寘璐ｄ换鍒讹紝灏忓矖鏉戦鍒涖€? },
      { id: 'kp2', title: '瀵瑰寮€鏀?, content: '1980骞磋娣卞湷绛夊洓涓粡娴庣壒鍖恒€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鐜囧厛瀹炶澶у寘骞层€佹媺寮€鍐滄潙鏀归潻搴忓箷鐨勬槸', options: ['瀹夊窘鍑ら槼灏忓矖鏉?, '姹熻嫃鍗庤タ鏉?, '娌冲崡鍗楄鏉?, '澶╂触澶ч偙搴?], answerIndex: 0, explanation: '绠€鍗曪細灏忓矖鏉?8鎴峰啘姘戙€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍐滄潙鏀归潻瀹炶鐨勫埗搴︽槸', options: ['浜烘皯鍏ぞ', '瀹跺涵鑱斾骇鎵垮寘璐ｄ换鍒?, '鍐滀笟鍚堜綔鍖?, '鍦熷湴鍥芥湁鍖?], answerIndex: 1, explanation: '绠€鍗曪細鍖呬骇鍒版埛銆佽嚜璐熺泩浜忋€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '1980骞存垜鍥借绔嬬殑缁忔祹鐗瑰尯涓嶅寘鎷?, options: ['娣卞湷', '鐝犳捣', '姹曞ご', '涓婃捣'], answerIndex: 3, explanation: '绠€鍗曪細鍥涗釜鐗瑰尯鏄繁鍦崇彔娴锋睍澶村帵闂ㄣ€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鎴愪负缁忔祹鐗瑰尯浠ｈ〃銆佸澶栧紑鏀剧獥鍙ｇ殑鍩庡競鏄?, options: ['鐝犳捣', '娣卞湷', '鍘﹂棬', '姹曞ご'], answerIndex: 1, explanation: '涓瓑锛氭繁鍦崇敱杈归櫜灏忛晣鍙樺ぇ閮藉競銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1988骞磋澧炶涓虹粡娴庣壒鍖虹殑鏄?, options: ['涓婃捣娴︿笢', '娴峰崡宀?, '澶ц繛', '闈掑矝'], answerIndex: 1, explanation: '涓瓑锛氭捣鍗楀缓鐪佸苟璁剧粡娴庣壒鍖恒€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '瀹跺涵鑱斾骇鎵垮寘璐ｄ换鍒朵箣鎵€浠ヨ兘璋冨姩鍐滄皯绉瀬鎬э紝鏄洜涓?, options: ['鍦熷湴褰掑啘姘戠鏈?, '浜ゅ鍥藉鐨勩€佺暀瓒抽泦浣撶殑銆佸墿涓嬮兘鏄嚜宸辩殑', '瀹炶骞冲潎涓讳箟', '鍙栨秷浜嗗啘涓氱◣'], answerIndex: 1, explanation: '涓瓑锛氳矗鏉冨埄缁撳悎銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾繁鍦冲師涓鸿竟闄插皬闀囷紝鐭煭鍑犲勾闂达紝鎴愪负涓€搴х幇浠ｅ寲鍩庡競鈥︹€︺€嶈繖涓昏寰楃泭浜?, options: ['鍦熷湴鏀归潻', '璁剧珛缁忔祹鐗瑰尯銆佸疄琛屽澶栧紑鏀?, '瀹跺涵鑱斾骇鎵垮寘', '鍔犲叆涓栬锤'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽澶栧紑鏀炬斂绛栥€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缁忔祹鐗瑰尯鐨勪綔鐢ㄦ槸', options: ['瀹炵幇浜嗗浗瀹剁粺涓€', '寮曡繘澶栬祫鎶€鏈€佹垚涓哄澶栧紑鏀剧殑绐楀彛鍜岃瘯楠岀敯', '寤烘垚浜嗙壒鍒鏀垮尯', '瑙ｅ喅浜嗗氨涓氶棶棰?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀獥鍙ｄ綔鐢ㄣ€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝浜烘皯鍏ぞ涓庡搴仈浜ф壙鍖呰矗浠诲埗锛屽悗鑰呯殑杩涙鍦ㄤ簬', options: ['鍦熷湴鍏湁', '浣垮啘姘戣幏寰楃敓浜х粡钀ヨ嚜涓绘潈', '瑙勬ā鏇村ぇ', '闆嗕綋鍔冲姩'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃В鏀剧敓浜у姏銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鎴戝浗瀵瑰寮€鏀剧殑绗竴姝ユ槸', options: ['寮€鏀?4涓部娴峰煄甯?, '璁剧珛缁忔祹鐗瑰尯', '寮€杈熸部娴风粡娴庡紑鏀惧尯', '鍔犲叆涓栬锤缁勭粐'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀壒鍖烘槸绐佺牬鍙ｃ€? },
    ],
  },

  {
    id: 'g-his-8b-10', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏀归潻寮€鏀句笌涓浗鐗硅壊绀句細涓讳箟鐨勫紑鍒?, edition: '缁熺紪鐗?, section: '绗?0璇?鏀归潻寮€鏀惧拰绀句細涓讳箟鐜颁唬鍖栧缓璁剧殑鍏ㄩ潰灞曞紑',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍗楁柟璋堣瘽涓庡競鍦虹粡娴?, content: '1992骞撮倱灏忓钩鍗楁柟璋堣瘽锛屽崄鍥涘ぇ寤虹珛甯傚満缁忔祹浣撳埗銆? },
      { id: 'kp2', title: '瀵瑰寮€鏀炬牸灞€', content: '鐗瑰尯鈥旀部娴峰煄甯傗€旀部娴峰紑鏀惧尯鈥斿唴鍦般€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1992骞村彂琛ㄩ噸瑕佸崡鏂硅皥璇濈殑鏄?, options: ['姣涙辰涓?, '閭撳皬骞?, '姹熸辰姘?, '鑳￠敠娑?], answerIndex: 1, explanation: '绠€鍗曪細閭撳皬骞虫鏄屾繁鍦充笂娴疯皥璇濄€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鏄庣‘鎻愬嚭寤虹珛绀句細涓讳箟甯傚満缁忔祹浣撳埗鐨勪細璁槸', options: ['涓叡鍗佷笁澶?, '涓叡鍗佸洓澶?, '涓叡鍗佷簲澶?, '涓叡鍗佸叚澶?], answerIndex: 1, explanation: '绠€鍗曪細1992骞翠腑鍏卞崄鍥涘ぇ銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鎴戝浗瀵瑰寮€鏀惧舰鎴愮殑鏍煎眬鐗圭偣鏄?, options: ['鍙紑鏀炬部娴?, '鍏ㄦ柟浣嶃€佸灞傛銆佸棰嗗煙', '鍙紑鏀惧ぇ鍩庡競', '鍙瑗挎柟鍥藉寮€鏀?], answerIndex: 1, explanation: '绠€鍗曪細鍏ㄦ柟浣嶅灞傛瀹介鍩熴€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '閭撳皬骞冲崡鏂硅皥璇濊В鍐崇殑鍥版壈鏄?, options: ['浠€涔堟槸绀句細涓讳箟銆佹€庢牱寤鸿绀句細涓讳箟', '瑕佷笉瑕佹敼闈╁紑鏀?, '瑕佷笉瑕侀樁绾ф枟浜?, '瑕佷笉瑕佽鍒掔粡娴?], answerIndex: 0, explanation: '涓瓑锛氬彂灞曟墠鏄‖閬撶悊銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鎴愪负鍥介檯缁忔祹銆侀噾铻嶃€佽锤鏄撲腑蹇冧箣涓€鐨勫紑鏀鹃緳澶存槸', options: ['娣卞湷', '涓婃捣娴︿笢', '鐝犳捣', '鍘﹂棬'], answerIndex: 1, explanation: '涓瓑锛?990骞村紑鍙戝紑鏀炬郸涓溿€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '涓叡鍗佸洓澶ф彁鍑烘垜鍥界粡娴庝綋鍒舵敼闈╃殑鐩爣鏄?, options: ['瀹炶璁″垝缁忔祹', '寤虹珛绀句細涓讳箟甯傚満缁忔祹浣撳埗', '瀹炶鍗曚竴鍏湁鍒?, '寤虹珛鐜颁唬浼佷笟鍒跺害'], answerIndex: 1, explanation: '涓瓑锛氬競鍦虹粡娴庝綋鍒剁洰鏍囥€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屽彂灞曟墠鏄‖閬撶悊鈥︹€︽敼闈╁紑鏀捐儐瀛愯澶т竴浜涖€傘€嶈璁茶瘽鏄?, options: ['姣涙辰涓溿€婅鍗佸ぇ鍏崇郴銆?, '閭撳皬骞冲崡鏂硅皥璇?, '姹熸辰姘戝崄鍥涘ぇ鎶ュ憡', '鑳￠敠娑涘崄涓冨ぇ鎶ュ憡'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽崡鏂硅皥璇濄€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級閭撳皬骞冲崡鏂硅皥璇濈殑閲嶈鎰忎箟鏄?, options: ['寮€鍚簡鏀归潻寮€鏀?, '杩涗竴姝ヨВ鏀句簡鎬濇兂锛屾帹鍔ㄦ敼闈╁紑鏀炬繁鍖?, '纭珛浜嗙ぞ浼氫富涔夊埗搴?, '缁撴潫浜嗘枃闈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽缓璁捐繘鍏ユ柊闃舵銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝缁忔祹鐗瑰尯涓庝笂娴锋郸涓滃紑鍙戯紝鍚庤€呯殑鐗圭偣鏄?, options: ['闈㈢Н鏇村皬', '鎴愪负90骞翠唬瀵瑰寮€鏀剧殑閲嶇偣鍜屾爣蹇?, '鍙彂灞曞啘涓?, '浣嶄簬骞夸笢'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾郸涓滄槸榫欏ご銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級绀句細涓讳箟甯傚満缁忔祹浣撳埗鐨勫缓绔嬶紝璇存槑鎴戝浗', options: ['鏀惧純浜嗚鍒?, '鎶婄ぞ浼氫富涔夊熀鏈埗搴︿笌甯傚満缁忔祹缁撳悎璧锋潵', '瀹炵幇浜嗙鏈夊寲', '鍥炲埌浜嗛棴鍏抽攣鍥?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀悊璁哄垱鏂般€? },
    ],
  },

  {
    id: 'g-his-8b-11', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 鏀归潻寮€鏀句笌涓浗鐗硅壊绀句細涓讳箟鐨勫紑鍒?, edition: '缁熺紪鐗?, section: '绗?1璇?绀句細涓讳箟鍒濈骇闃舵鍩烘湰璺嚎',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡鍗佷笁澶?, content: '1987骞存彁鍑哄垵绾ч樁娈电悊璁哄拰鍩烘湰璺嚎銆? },
      { id: 'kp2', title: '涓夋璧版垬鐣?, content: '鐜颁唬鍖栧缓璁惧垎涓夋璧扮殑鎴樼暐閮ㄧ讲銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绯荤粺闃愯堪绀句細涓讳箟鍒濈骇闃舵鐞嗚鐨勪細璁槸', options: ['涓叡鍗佷簩澶?, '涓叡鍗佷笁澶?, '涓叡鍗佸洓澶?, '涓叡鍗佷簲澶?], answerIndex: 1, explanation: '绠€鍗曪細1987骞村崄涓夊ぇ銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '绀句細涓讳箟鍒濈骇闃舵鍩烘湰璺嚎鐨勬牳蹇冨唴瀹规槸', options: ['涓€涓腑蹇冦€佷袱涓熀鏈偣', '涓夋璧?, '涓や釜鍑℃槸', '涓夐潰绾㈡棗'], answerIndex: 0, explanation: '绠€鍗曪細浠ョ粡娴庡缓璁句负涓績锛屽潥鎸佸洓椤瑰熀鏈師鍒欙紝鍧氭寔鏀归潻寮€鏀俱€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '涓や釜鍩烘湰鐐规槸鎸?, options: ['鍧氭寔鍥涢」鍩烘湰鍘熷垯銆佸潥鎸佹敼闈╁紑鏀?, '鍧氭寔鍏氱殑棰嗗銆佸潥鎸佷汉姘戞皯涓讳笓鏀?, '鍧氭寔绀句細涓讳箟銆佸潥鎸侀┈鍒椾富涔?, '鍧氭寔鍙戝睍銆佸潥鎸佺ǔ瀹?], answerIndex: 0, explanation: '绠€鍗曪細鍥涢」鍩烘湰鍘熷垯涓庢敼闈╁紑鏀俱€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '涓叡鍗佷笁澶у埗瀹氱殑缁忔祹鍙戝睍鎴樼暐鏄?, options: ['涓ゆ璧?, '涓夋璧?, '涓ゆ璧版垬鐣?, '浜斿勾璁″垝'], answerIndex: 1, explanation: '涓瓑锛氫笁姝ヨ蛋鍙戝睍鎴樼暐銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓€涓腑蹇冩槸鎸?, options: ['浠ラ樁绾ф枟浜変负涓績', '浠ョ粡娴庡缓璁句负涓績', '浠ユ枃鍖栧缓璁句负涓績', '浠ュ澶栧紑鏀句负涓績'], answerIndex: 1, explanation: '涓瓑锛氫互缁忔祹寤鸿涓轰腑蹇冦€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鎻愬嚭寤鸿鏈変腑鍥界壒鑹茬殑绀句細涓讳箟鏄湪', options: ['涓叡鍗佷竴灞婁笁涓叏浼?, '涓叡鍗佷簩澶?, '涓叡鍗佷笁澶?, '涓叡鍗佸洓澶?], answerIndex: 1, explanation: '涓瓑锛?982骞撮倱灏忓钩鍗佷簩澶ф彁鍑恒€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岄瀵煎拰鍥㈢粨鍏ㄥ浗鍚勬棌浜烘皯锛屼互缁忔祹寤鸿涓轰腑蹇冿紝鍧氭寔鍥涢」鍩烘湰鍘熷垯锛屽潥鎸佹敼闈╁紑鏀锯€︹€︺€嶈鍩烘湰璺嚎鎻愬嚭浜?, options: ['涓叡鍗佷簩澶?, '涓叡鍗佷笁澶?, '涓叡鍗佸洓澶?, '涓叡鍗佷簲澶?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽崄涓夊ぇ鍒跺畾銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍥涢」鍩烘湰鍘熷垯鏄?, options: ['寮哄浗涔嬭矾', '绔嬪浗涔嬫湰', '鍏村浗涔嬭', '涓績宸ヤ綔'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀珛鍥戒箣鏈€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏀归潻寮€鏀炬槸', options: ['绔嬪浗涔嬫湰', '寮哄浗涔嬭矾', '涓績浠诲姟', '鍩烘湰鏀挎不鍒跺害'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽己鍥戒箣璺€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓夋璧版垬鐣ョ殑绗竴姝ユ槸', options: ['瑙ｅ喅浜烘皯娓╅ケ闂', '杈惧埌灏忓悍姘村钩', '鍩烘湰瀹炵幇鐜颁唬鍖?, '寤烘垚鐜颁唬鍖栧己鍥?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽凡瀹炵幇娓╅ケ涓庡皬搴枫€? },
    ],
  },

  {
    id: 'g-his-8b-12', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗洓鍗曞厓 涓浗鐗硅壊绀句細涓讳箟杩堝悜21涓栫邯', edition: '缁熺紪鐗?, section: '绗?2璇?鍔犲揩鏀归潻寮€鏀惧拰绀句細涓讳箟鐜颁唬鍖栧缓璁炬浼?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '閭撳皬骞崇悊璁烘寚瀵煎湴浣?, content: '1997骞村崄浜斿ぇ纭珛閭撳皬骞崇悊璁轰负鎸囧銆? },
      { id: 'kp2', title: '娓境鍥炲綊', content: '1997棣欐腐銆?999婢抽棬鍥炲綊锛屼竴鍥戒袱鍒舵垚鍔熷疄璺点€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎶婇倱灏忓钩鐞嗚纭珛涓哄厷鐨勬寚瀵兼€濇兂鐨勪細璁槸', options: ['涓叡鍗佸洓澶?, '涓叡鍗佷簲澶?, '涓叡鍗佸叚澶?, '涓叡鍗佷竷澶?], answerIndex: 1, explanation: '绠€鍗曪細1997骞翠腑鍏卞崄浜斿ぇ銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '棣欐腐鍥炲綊绁栧浗鐨勬椂闂存槸', options: ['1997骞?鏈?鏃?, '1999骞?2鏈?0鏃?, '1999骞?鏈?鏃?, '1997骞?2鏈?0鏃?], answerIndex: 0, explanation: '绠€鍗曪細1997骞?鏈?鏃ラ娓洖褰掋€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '婢抽棬鍥炲綊绁栧浗鐨勬椂闂存槸', options: ['1997骞?鏈?鏃?, '1999骞?2鏈?0鏃?, '1999骞?鏈?鏃?, '1997骞?2鏈?0鏃?], answerIndex: 1, explanation: '绠€鍗曪細1999骞?2鏈?0鏃ユ境闂ㄥ洖褰掋€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '瀹炵幇绁栧浗鍜屽钩缁熶竴鐨勫熀鏈柟閽堟槸', options: ['姝﹀姏缁熶竴', '鍜屽钩缁熶竴銆佷竴鍥戒袱鍒?, '鑱旈偊鍒?, '姘戞棌鍖哄煙鑷不'], answerIndex: 1, explanation: '涓瓑锛氫竴鍥戒袱鍒朵负瀹炵幇绁栧浗缁熶竴鎻愬嚭銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '棣欐腐銆佹境闂ㄥ洖褰掑悗寤虹珛鐨勭壒鍒鏀垮尯锛屼繚鐣欑殑鏄?, options: ['绀句細涓讳箟鍒跺害', '璧勬湰涓讳箟鍒跺害', '鍚涗富绔嬪鍒?, '娈栨皯鍒跺害'], answerIndex: 1, explanation: '涓瓑锛氫竴鍥戒袱鍒躲€佹腐浜烘不娓境浜烘不婢炽€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '閭撳皬骞崇悊璁轰富瑕佸洖绛旂殑鏍规湰闂鏄?, options: ['浠€涔堟槸绀句細涓讳箟銆佹€庢牱寤鸿绀句細涓讳箟', '寤鸿浠€涔堟牱鐨勫厷', '瀹炵幇浠€涔堟牱鐨勫彂灞?, '鏂版椂浠ｅ潥鎸佸拰鍙戝睍浠€涔堟牱鐨勪腑鍥界壒鑹茬ぞ浼氫富涔?], answerIndex: 0, explanation: '涓瓑锛氭敼闈╁紑鏀惧拰鐜颁唬鍖栧缓璁炬寚瀵兼€濇兂銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?997骞?鏈?鏃ラ浂鐐癸紝浜旀槦绾㈡棗鍦ㄩ娓崌璧封€︹€︺€嶈鍦烘櫙鏍囧織鐫€', options: ['棣欐腐琚嫳鍥藉壊鍗?, '棣欐腐鍥炲綊绁栧浗', '婢抽棬鍥炲綊', '璁剧珛缁忔祹鐗瑰尯'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾礂鍒风櫨骞磋€昏颈銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級棣欐腐銆佹境闂ㄥ洖褰掔鍥界殑閲嶈鎰忎箟鏄?, options: ['瀹炵幇浜嗗浗瀹跺畬鍏ㄧ粺涓€', '鏍囧織涓浗浜烘皯娲楅洩浜嗙櫨骞村浗鑰伙紝鍦ㄥ畬鎴愮鍥界粺涓€澶т笟閬撹矾涓婅繄鍑洪噸瑕佷竴姝?, '瑙ｅ喅浜嗗彴婀鹃棶棰?, '缁撴潫浜嗗崐娈栨皯鍦板巻鍙?], answerIndex: 1, explanation: '鐪熼锛氫竴鍥戒袱鍒舵垚鍔熷疄璺点€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎶婇倱灏忓钩鐞嗚鍐欏叆鍏氱珷銆佺‘绔嬩负鎸囧鎬濇兂鏄湪', options: ['涓叡鍗佸洓澶?, '涓叡鍗佷簲澶?, '涓叡鍗佸叚澶?, '涓叡鍗佸叓澶?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄┈鍏嬫€濅富涔変腑鍥藉寲鎴愭灉銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝娓境鍥炲綊涓庡彴婀鹃棶棰橈紝姝ｇ‘鐨勬槸', options: ['閮芥槸澶栧浗娈栨皯閬楃暀', '娓境鏄畺姘戦仐鐣欍€佸彴婀炬槸涓浗鍐呮斂', '閮藉凡鍥炲綊', '閮藉疄琛岀ぞ浼氫富涔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彴婀炬槸鍐呮斂闂銆? },
    ],
  },

  {
    id: 'g-his-8b-13', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗洓鍗曞厓 涓浗鐗硅壊绀句細涓讳箟杩堝悜21涓栫邯', edition: '缁熺紪鐗?, section: '绗?3璇?涓浗鐗硅壊绀句細涓讳箟浜嬩笟鍙栧緱鏂版垚灏?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?3璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓変釜浠ｈ〃閲嶈鎬濇兂', content: '2002骞村崄鍏ぇ纭珛涓烘寚瀵兼€濇兂銆? },
      { id: 'kp2', title: '鍔犲叆涓栬锤涓庢柊鎴愬氨', content: '2001骞村姞鍏TO锛岀患鍚堝浗鍔涙彁鍗囥€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎻愬嚭涓変釜浠ｈ〃閲嶈鎬濇兂鐨勬槸', options: ['閭撳皬骞?, '姹熸辰姘?, '鑳￠敠娑?, '涔犺繎骞?], answerIndex: 1, explanation: '绠€鍗曪細姹熸辰姘戞彁鍑恒€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '涓浗姝ｅ紡鍔犲叆涓栫晫璐告槗缁勭粐鏄湪', options: ['2000骞?, '2001骞?, '2008骞?, '2010骞?], answerIndex: 1, explanation: '绠€鍗曪細2001骞?2鏈堝姞鍏TO銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '涓変釜浠ｈ〃閲嶈鎬濇兂琚‘绔嬩负鍏氱殑鎸囧鎬濇兂鏄湪', options: ['涓叡鍗佷簲澶?, '涓叡鍗佸叚澶?, '涓叡鍗佷竷澶?, '涓叡鍗佸叓澶?], answerIndex: 1, explanation: '绠€鍗曪細2002骞村崄鍏ぇ銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '涓変釜浠ｈ〃鐨勫唴瀹逛笉鍖呮嫭', options: ['浠ｈ〃涓浗鍏堣繘鐢熶骇鍔涚殑鍙戝睍瑕佹眰', '浠ｈ〃涓浗鍏堣繘鏂囧寲鐨勫墠杩涙柟鍚?, '浠ｈ〃涓浗鏈€骞垮ぇ浜烘皯鐨勬牴鏈埄鐩?, '浠ｈ〃涓浗鍐滄皯闃剁骇鐨勫埄鐩?], answerIndex: 3, explanation: '涓瓑锛氫笁涓唬琛ㄥ嵆鍏堣繘鐢熶骇鍔涖€佸厛杩涙枃鍖栥€佹渶骞垮ぇ浜烘皯鏍规湰鍒╃泭銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '21涓栫邯鍒濇垜鍥藉湪缁忔祹鍏ㄧ悆鍖栦腑杩堝嚭閲嶈涓€姝ョ殑浜嬩欢鏄?, options: ['寤虹珛缁忔祹鐗瑰尯', '鍔犲叆涓栫晫璐告槗缁勭粐', '寮€鍙戞郸涓?, '鎭㈠鑱斿悎鍥藉腑浣?], answerIndex: 1, explanation: '涓瓑锛氳瀺鍏ヤ笘鐣岀粡娴庝綋绯汇€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '2008骞存垜鍥戒妇鍔炵殑鍥介檯鐩涗細鏄?, options: ['涓栫晫鏉冻鐞冭禌', '鍖椾含濂ヨ繍浼?, '涓栧崥浼?, '浜氳繍浼?], answerIndex: 1, explanation: '涓瓑锛氬寳浜瀛ｅゥ杩愪細銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岀粡杩?5骞磋皥鍒わ紝涓浗缁堜簬鎴愪负涓栬锤缁勭粐鏂版垚鍛樸€傘€嶈繖涓€浜嬩欢鐨勬剰涔夋槸', options: ['鏍囧織瀹炵幇宸ヤ笟鍖?, '涓烘垜鍥藉弬涓庣粡娴庡叏鐞冨寲寮€杈熸柊閫斿緞', '瀹炵幇浜嗗浗瀹剁粺涓€', '缁撴潫浜嗛棴鍏抽攣鍥?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽澶栧紑鏀捐繘鍏ユ柊闃舵銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓変釜浠ｈ〃閲嶈鎬濇兂涓昏鍥炵瓟鐨勯棶棰樻槸', options: ['浠€涔堟槸绀句細涓讳箟', '寤鸿浠€涔堟牱鐨勫厷銆佹€庢牱寤鸿鍏?, '瀹炵幇浠€涔堟牱鐨勫彂灞?, '鏂版椂浠ｅ潥鎸佸拰鍙戝睍浠€涔堟牱鐨勪腑鍥界壒鑹茬ぞ浼氫富涔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽厷寤洪棶棰樸€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓浗鍔犲叆涓栬锤缁勭粐鐨勭Н鏋佸奖鍝嶆槸', options: ['绔嬪嵆鎴愪负鍙戣揪鍥藉', '涓虹粡娴庡彂灞曡耽寰楁洿濂藉浗闄呯幆澧?, '鍓婂急浜嗘皯鏃忓伐涓?, '鍑忓皯浜嗗氨涓?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾満閬囦笌鎸戞垬骞跺瓨銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝閭撳皬骞崇悊璁恒€佷笁涓唬琛ㄣ€佺瀛﹀彂灞曡锛屽畠浠殑鍏卞悓鐐规槸', options: ['閮藉洖绛斿厷寤洪棶棰?, '閮芥槸椹厠鎬濅富涔変腑鍥藉寲鐨勬垚鏋?, '閮藉洖绛斿彂灞曢棶棰?, '閮藉舰鎴愪簬鏀归潻寮€鏀惧墠'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼竴鑴夌浉鎵垮張涓庢椂淇辫繘銆? },
    ],
  },

  {
    id: 'g-his-8b-14', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗洓鍗曞厓 涓浗鐗硅壊绀句細涓讳箟杩堝悜21涓栫邯', edition: '缁熺紪鐗?, section: '绗?4璇?鍥介槻鍜屽浜ゅ伐浣滄柊灞€闈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?4璇? },
    knowledgePoints: [
      { id: 'kp1', title: '澶栦氦鏂板钩鍙?, content: '2001骞碅PEC涓婃捣銆佷笂娴峰悎浣滅粍缁囥€? },
      { id: 'kp2', title: '鍐涢槦鐜颁唬鍖?, content: '浜斿ぇ鎴樺尯銆佸己鍐涘叴鍐涖€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '2001骞翠腑鍥藉湪涓婃捣鎴愬姛涓惧姙鐨勫浗闄呬細璁槸', options: ['鍗氶硨璁哄潧', 'APEC棰嗗浜洪潪姝ｅ紡浼氳', 'G20宄颁細', '涓囬殕浼氳'], answerIndex: 1, explanation: '绠€鍗曪細2001骞翠笂娴稟PEC銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '2001骞存垚绔嬨€佷互浜掍俊姹傚畨鍏ㄧ殑澶氳竟鍚堜綔缁勭粐鏄?, options: ['鑱斿悎鍥?, '涓婃捣鍚堜綔缁勭粐', '鍖楃害', '娆х洘'], answerIndex: 1, explanation: '绠€鍗曪細涓婃捣鍚堜綔缁勭粐銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '2016骞翠腑鍥藉啗闃熸敼闈╋紝璋冩暣缁勫缓鐨勬垬鍖烘暟閲忔槸', options: ['涓夊ぇ鎴樺尯', '浜斿ぇ鎴樺尯', '涓冨ぇ鎴樺尯', '鍏ぇ鎴樺尯'], answerIndex: 1, explanation: '绠€鍗曪細涓滈儴銆佸崡閮ㄣ€佽タ閮ㄣ€佸寳閮ㄣ€佷腑閮ㄤ簲澶ф垬鍖恒€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鏀归潻寮€鏀惧悗涓浗鐗硅壊澶у浗澶栦氦鍏ㄩ潰鎺ㄨ繘锛屽舰鎴愮殑甯冨眬鏄?, options: ['鍗曡竟澶栦氦', '鍏ㄦ柟浣嶃€佸灞傛銆佺珛浣撳寲澶栦氦甯冨眬', '鍙笌澶у浗寤轰氦', '鍙笌鍛ㄨ竟寤轰氦'], answerIndex: 1, explanation: '涓瓑锛氬叏鏂逛綅澶氬眰娆＄珛浣撳寲銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓婃捣鍚堜綔缁勭粐鏈€鍒濈敱涓浗銆佷縿缃楁柉鍙婁腑浜氬浗瀹剁粍鎴愶紝鍏舵牳蹇冪悊蹇垫槸', options: ['鍐涗簨鍚岀洘', '浜掍俊銆佷簰鍒┿€佸钩绛夈€佸崗鍟?, '闇告潈涓讳箟', '鍏抽棬涓讳箟'], answerIndex: 1, explanation: '涓瓑锛氱粨浼翠笉缁撶洘銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鏂版椂浠ｇ殑寮哄啗鐩爣鏄?, options: ['寤鸿搴炲ぇ鍐涢槦', '寤鸿涓€鏀惉鍏氭寚鎸ャ€佽兘鎵撹儨浠椼€佷綔椋庝紭鑹殑浜烘皯鍐涢槦', '鍙戝睍鏍告鍣?, '鎵╁ぇ鍐涜垂'], answerIndex: 1, explanation: '涓瓑锛氬厷鍦ㄦ柊鏃朵唬鐨勫己鍐涚洰鏍囥€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€?001骞?0鏈堬紝浜氬お缁忓悎缁勭粐棰嗗浜鸿仛棣栦笂娴封€︹€︺€嶈繖娆′細璁殑涓婚鏄?, options: ['鏂颁笘绾€佹柊鎸戞垬锛氬弬涓庛€佸悎浣滐紝淇冭繘鍏卞悓绻佽崳', '姹傚悓瀛樺紓', '鍜屽钩鍙戝睍', '涓€甯︿竴璺?], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼笂娴稟PEC銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級21涓栫邯鍒濅腑鍥藉紑灞曞杈瑰浜ょ殑鎴愬氨鏄?, options: ['鎻愬嚭鍜屽钩鍏卞浜旈」鍘熷垯', '涓惧姙APEC銆佹垚绔嬩笂娴峰悎浣滅粍缁?, '鎭㈠鑱斿悎鍥藉腑浣?, '涓編寤轰氦'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽杈瑰浜よ垶鍙般€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓囬殕浼氳涓嶢PEC涓婃捣浼氳锛屽墠鑰?, options: ['鐢变腑鍥戒富瀵?, '鏄涓€娆℃病鏈夋畺姘戝浗瀹跺弬鍔犵殑浜氶潪浼氳', '褰㈡垚鍏ㄦ柟浣嶅浜?, '鎴愮珛鑱斿悎鍥?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽浜ゅ巻绋嬨€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏂版椂浠ｅ浗闃插拰鍐涢槦鏀归潻鐨勭洰鐨勬槸', options: ['鎵╁ぇ鍐涢槦瑙勬ā', '鎻愰珮鍐涢槦鎴樻枟鍔涖€佸缓璁句笘鐣屼竴娴佸啗闃?, '澧炲姞鍐涜垂', '瀵瑰鎵╁紶'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽己鍐涘叴鍐涖€? },
    ],
  },

  {
    id: 'g-his-8b-15', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簲鍗曞厓 鍦ㄦ柊褰㈠娍涓嬪潥鎸佸拰鍙戝睍涓浗鐗硅壊绀句細涓讳箟', edition: '缁熺紪鐗?, section: '绗?5璇?寮€濮嬪叏闈㈠缓璁惧皬搴风ぞ浼?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?5璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡鍗佸叚澶?, content: '2002骞存彁鍑哄叏闈㈠缓璁惧皬搴风ぞ浼氱洰鏍囥€? },
      { id: 'kp2', title: '濂嬫枟鐩爣', content: '鏂颁笘绾ご浜屽崄骞村叏闈㈠缓璁炬儬鍙婂崄鍑犱嚎浜哄彛鐨勬洿楂樻按骞冲皬搴风ぞ浼氥€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎻愬嚭鍏ㄩ潰寤鸿灏忓悍绀句細濂嬫枟鐩爣鐨勪細璁槸', options: ['涓叡鍗佷簲澶?, '涓叡鍗佸叚澶?, '涓叡鍗佷竷澶?, '涓叡鍗佸叓澶?], answerIndex: 1, explanation: '绠€鍗曪細2002骞村崄鍏ぇ銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍗佸叚澶у綋閫変腑鍏变腑澶€讳功璁扮殑鏄?, options: ['姹熸辰姘?, '鑳￠敠娑?, '涔犺繎骞?, '娓╁瀹?], answerIndex: 1, explanation: '绠€鍗曪細鑳￠敠娑涖€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍏ㄩ潰寤鸿灏忓悍绀句細鏄寚鍦ㄤ粈涔堟椂闂村唴', options: ['20涓栫邯鏈€鍚庡崄骞?, '21涓栫邯澶翠簩鍗佸勾', '2035骞村墠', '2050骞村墠'], answerIndex: 1, explanation: '绠€鍗曪細21涓栫邯澶翠簩鍗佸勾銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '灏忓悍绀句細鐨勫缓璁剧洰鏍囨牳蹇冩槸', options: ['缁忔祹鏇村揩澧為暱', '鎯犲強鍗佸嚑浜夸汉鍙ｇ殑鏇撮珮姘村钩銆佹洿鍏ㄩ潰銆佹洿鍧囪　鐨勫皬搴?, '鍙彂灞曞煄甯?, '鍏堝瘜甯﹀姩鍚庡瘜'], answerIndex: 1, explanation: '涓瓑锛氬叏闈㈠皬搴疯鐩栧煄涔°€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鍗佸叚澶у皢鍝釜閲嶈鎬濇兂鍐欏叆鍏氱珷浣滀负鎸囧', options: ['閭撳皬骞崇悊璁?, '涓変釜浠ｈ〃閲嶈鎬濇兂', '绉戝鍙戝睍瑙?, '涔犺繎骞虫柊鏃朵唬鎬濇兂'], answerIndex: 1, explanation: '涓瓑锛氫笁涓唬琛ㄥ啓鍏ュ厷绔犮€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '浠庢俯楗卞埌鎬讳綋灏忓悍鍐嶅埌鍏ㄩ潰灏忓悍锛屼綋鐜颁簡鎴戝浗', options: ['涓€姝ュ埌浣?, '鐜颁唬鍖栧缓璁惧垎闃舵銆侀€愭鎺ㄨ繘', '鍙噸缁忔祹', '蹇借姘戠敓'], answerIndex: 1, explanation: '涓瓑锛氬惊搴忔笎杩涖€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾垜浠鍦ㄦ湰涓栫邯澶翠簩鍗佸勾锛岄泦涓姏閲忥紝鍏ㄩ潰寤鸿鎯犲強鍗佸嚑浜夸汉鍙ｇ殑鏇撮珮姘村钩鐨勫皬搴风ぞ浼氥€傘€嶈鐩爣鎻愬嚭浜?, options: ['涓叡鍗佷簲澶?, '涓叡鍗佸叚澶?, '涓叡鍗佷竷澶?, '涓叡鍗佸叓澶?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽崄鍏ぇ閮ㄧ讲銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍏ㄩ潰寤鸿灏忓悍绀句細涓庡熀鏈疄鐜扮幇浠ｅ寲鐨勫叧绯绘槸', options: ['鍓嶈€呮槸鍚庤€呯殑蹇呰鍑嗗', '浜岃€呭悓鏃跺疄鐜?, '鍓嶈€呭凡瀹屾垚', '鍚庤€呭凡瀹屾垚'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽垎闃舵鎴樼暐銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍏ㄩ潰灏忓悍鐨勫叏闈綋鐜板湪', options: ['缁忔祹鎸囨爣澧為暱', '缁忔祹銆佹斂娌汇€佹枃鍖栥€佺ぞ浼氥€佺敓鎬佹枃鏄庡叏闈㈠彂灞?, '鍙湅GDP', '鍙湅鍩庡競'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼簲浣嶄竴浣撱€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝閭撳皬骞充笁姝ヨ蛋涓庡崄鍏ぇ鍏ㄩ潰寤鸿灏忓悍绀句細锛屽悗鑰呮槸瀵瑰墠鑰呯殑', options: ['鍚﹀畾', '缁ф壙鍜屽彂灞?, '閲嶅', '鍊掗€€'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾垬鐣ュ欢缁€? },
    ],
  },

  {
    id: 'g-his-8b-16', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簲鍗曞厓 鍦ㄦ柊褰㈠娍涓嬪潥鎸佸拰鍙戝睍涓浗鐗硅壊绀句細涓讳箟', edition: '缁熺紪鐗?, section: '绗?6璇?澶哄彇鍏ㄩ潰寤鸿灏忓悍绀句細鏂拌儨鍒?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?6璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡鍗佷竷澶?, content: '2007骞存彁鍑虹瀛﹀彂灞曡銆? },
      { id: 'kp2', title: '绉戝鍙戝睍瑙?, content: '绗竴瑕佷箟鏄彂灞曪紝鏍稿績鏄互浜轰负鏈€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎻愬嚭绉戝鍙戝睍瑙傜殑浼氳鏄?, options: ['涓叡鍗佸叚澶?, '涓叡鍗佷竷澶?, '涓叡鍗佸叓澶?, '涓叡鍗佷節澶?], answerIndex: 1, explanation: '绠€鍗曪細2007骞村崄涓冨ぇ銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '绉戝鍙戝睍瑙傜殑鏍稿績鏄?, options: ['鍙戝睍', '浠ヤ汉涓烘湰', '鍏ㄩ潰鍗忚皟鍙寔缁?, '缁熺鍏奸【'], answerIndex: 1, explanation: '绠€鍗曪細浠ヤ汉涓烘湰銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '绉戝鍙戝睍瑙傜殑绗竴瑕佷箟鏄?, options: ['浠ヤ汉涓烘湰', '鍙戝睍', '缁熺鍏奸【', '鏀归潻寮€鏀?], answerIndex: 1, explanation: '绠€鍗曪細绗竴瑕佷箟鏄彂灞曘€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '绉戝鍙戝睍瑙傜殑鍩烘湰瑕佹眰鏄?, options: ['鍏ㄩ潰鍗忚皟鍙寔缁?, '浠ヤ汉涓烘湰', '缁熺鍏奸【', '楂橀€熷闀?], answerIndex: 0, explanation: '涓瓑锛氬叏闈㈠崗璋冨彲鎸佺画銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '绉戝鍙戝睍瑙傝纭珛涓哄厷鐨勬寚瀵兼€濇兂鏄湪', options: ['涓叡鍗佷竷澶?, '涓叡鍗佸叓澶?, '涓叡鍗佷節澶?, '涓叡鍗佸叚澶?], answerIndex: 1, explanation: '涓瓑锛?012骞村崄鍏ぇ纭珛銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鎻愬嚭绉戝鍙戝睍瑙傦紝閽堝鐨勬槸鍙戝睍涓嚭鐜扮殑', options: ['缁忔祹杩囩儹', '涓嶅钩琛°€佷笉鍗忚皟銆佷笉鍙寔缁棶棰?, '鍥戒紒鍥板', '澶栦氦瀛ょ珛'], answerIndex: 1, explanation: '涓瓑锛氳浆鍙樺彂灞曟柟寮忋€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽潥鎸佷互浜轰负鏈紝鏍戠珛鍏ㄩ潰銆佸崗璋冦€佸彲鎸佺画鐨勫彂灞曡銆傘€嶈繖涓€鍙戝睍鐞嗗康鏄?, options: ['绉戝鍙戝睍瑙?, '閭撳皬骞崇悊璁?, '涓変釜浠ｈ〃', '涓浗姊?], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀瀛﹀彂灞曡銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绉戝鍙戝睍瑙備富瑕佸洖绛旂殑闂鏄?, options: ['浠€涔堟槸绀句細涓讳箟', '寤鸿浠€涔堟牱鐨勫厷', '瀹炵幇浠€涔堟牱鐨勫彂灞曘€佹€庢牱鍙戝睍', '鏂版椂浠ｅ潥鎸佸拰鍙戝睍浠€涔堟牱鐨勪腑鍥界壒鑹茬ぞ浼氫富涔?], answerIndex: 2, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彂灞曢棶棰樸€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓嬪垪鍋氭硶浣撶幇浠ヤ汉涓烘湰鐨勬槸', options: ['鐗囬潰杩芥眰GDP', '鍏虫敞姘戠敓銆佽В鍐崇兢浼楃湅鐥呴毦涓婂闅?, '鍏堟薄鏌撳悗娌荤悊', '蹇借绀句細淇濋殰'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彂灞曚负浜嗕汉姘戙€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝閭撳皬骞崇悊璁恒€佷笁涓唬琛ㄣ€佺瀛﹀彂灞曡锛屽畠浠叡鍚屽洖绛旂殑涓婚鏄?, options: ['闈╁懡闂', '鏀归潻寮€鏀惧拰鐜颁唬鍖栧缓璁鹃棶棰?, '鎴樹簤涓庡拰骞?, '娈栨皯闂'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼竴鑴夌浉鎵裤€? },
    ],
  },

  {
    id: 'g-his-8b-17', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簲鍗曞厓 鍦ㄦ柊褰㈠娍涓嬪潥鎸佸拰鍙戝睍涓浗鐗硅壊绀句細涓讳箟', edition: '缁熺紪鐗?, section: '绗?7璇?鎺ㄨ繘鍥介槻鍜屽啗闃熷缓璁惧強澶栦氦宸ヤ綔',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?7璇? },
    knowledgePoints: [
      { id: 'kp1', title: '寮哄啗鍏村啗', content: '鏂版椂浠ｅ己鍐涚洰鏍囷紝鍐涢槦缁勭粐褰㈡€佺幇浠ｅ寲銆? },
      { id: 'kp2', title: '鐗硅壊澶у浗澶栦氦', content: '鏋勫缓鍏ㄧ悆浼欎即鍏崇郴锛岃礋璐ｄ换澶у浗銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍏氬湪鏂板舰鍔夸笅鐨勫己鍐涚洰鏍囨槸', options: ['绉伴湼涓栫晫', '寤鸿涓€鏀惉鍏氭寚鎸ャ€佽兘鎵撹儨浠椼€佷綔椋庝紭鑹殑浜烘皯鍐涢槦', '鎵╁ぇ鍐涢槦鏁伴噺', '澧炲姞鍐涜垂'], answerIndex: 1, explanation: '绠€鍗曪細寮哄啗鐩爣銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鏂版椂浠ｄ腑鍥界壒鑹插ぇ鍥藉浜ょ殑鎬荤洰鏍囨槸', options: ['涓诲涓栫晫', '鎺ㄥ姩鏋勫缓鏂板瀷鍥介檯鍏崇郴銆佹瀯寤轰汉绫诲懡杩愬叡鍚屼綋', '缁撶洘浜夐湼', '闂叧鑷畧'], answerIndex: 1, explanation: '绠€鍗曪細浜虹被鍛借繍鍏卞悓浣撱€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '涓浗鍐涢槦纭珛鐨勪簲涓啗绉嶅寘鎷檰鍐涖€佹捣鍐涖€佺┖鍐涖€佺伀绠啗鍜?, options: ['鎴樼暐鏀彺閮ㄩ槦', '姝﹁閮ㄩ槦', '姘戝叺', '杈归槻鍐?], answerIndex: 0, explanation: '绠€鍗曪細鎴樼暐鏀彺閮ㄩ槦銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '涓浗澶栦氦鏀跨瓥鐨勫畻鏃ㄦ槸', options: ['缁存姢涓栫晫鍜屽钩銆佷績杩涘叡鍚屽彂灞?, '绉伴湼鍏ㄧ悆', '杈撳嚭闈╁懡', '瀛ょ珛涓讳箟'], answerIndex: 0, explanation: '涓瓑锛氱淮鎶や笘鐣屽拰骞炽€佷績杩涘叡鍚屽彂灞曘€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鏂版椂浠ｅ啗闃熷缓璁捐鍧氭寔鐨勫敮涓€鐨勩€佹牴鏈殑鏍囧噯鏄?, options: ['鏀挎不鏍囧噯', '鎴樻枟鍔涙爣鍑?, '瑁呭鏍囧噯', '瑙勬ā鏍囧噯'], answerIndex: 1, explanation: '涓瓑锛氳兘鎵撲粭銆佹墦鑳滀粭銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓浗瀵瑰鍏崇郴鐨勫熀鏈珛瓒崇偣鏄?, options: ['涓庡ぇ鍥界粨鐩?, '鍔犲己鍚屽彂灞曚腑鍥藉鐨勫洟缁撲笌鍚堜綔', '鍙笌鍛ㄨ竟寰€鏉?, '瀛ょ珛鍗曡竟'], answerIndex: 1, explanation: '涓瓑锛氬彂灞曚腑鍥藉鏄熀鏈珛瓒崇偣銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼腑鍥藉皢濮嬬粓鍋氫笘鐣屽拰骞崇殑寤鸿鑰呫€佸叏鐞冨彂灞曠殑璐＄尞鑰呫€佸浗闄呯З搴忕殑缁存姢鑰呫€傘€嶈繖浣撶幇浜?, options: ['闇告潈澶栦氦', '璐熻矗浠诲ぇ鍥界殑鎷呭綋', '瀛ょ珛涓讳箟', '缁撶洘澶栦氦'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽ぇ鍥芥媴褰撱€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎺ㄨ繘鍥介槻鍜屽啗闃熺幇浠ｅ寲鐨勭洰鐨勬槸', options: ['瀵瑰鎵╁紶', '缁存姢鍥藉涓绘潈銆佸畨鍏ㄣ€佸彂灞曞埄鐩?, '涓庣編鍥戒簤闇?, '澧炲姞灏变笟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼繚瀹跺崼鍥姐€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏃т腑鍥藉眻杈卞浜や笌鏂版椂浠ｄ腑鍥藉浜わ紝鏍规湰涓嶅悓鏄?, options: ['鏄惁鍙傚姞鍥介檯浼氳', '鏄惁鐙珛鑷富銆佺淮鎶ゅ浗瀹跺拰浜烘皯鍒╃泭', '鏄惁涓庡ぇ鍥戒氦寰€', '鏄惁娲鹃┗浣胯妭'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀珯璧锋潵浜嗐€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍚厷鎸囨尌鏄汉姘戝啗闃熺殑', options: ['鍞竴瀹楁棬', '寮哄啗涔嬮瓊', '寮哄啗涔嬭', '寮哄啗涔嬪熀'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽厷瀵瑰啗闃熺粷瀵归瀵笺€? },
    ],
  },

  {
    id: 'g-his-8b-18', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗叚鍗曞厓 涓浗鐗硅壊绀句細涓讳箟杩涘叆鏂版椂浠?, edition: '缁熺紪鐗?, section: '绗?8璇?鎿樼敾涓浗姊﹀畯浼熻摑鍥?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?8璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓浗姊?, content: '2012骞存彁鍑猴紝鍥藉瀵屽己銆佹皯鏃忔尟鍏淬€佷汉姘戝垢绂忋€? },
      { id: 'kp2', title: '涓や釜涓€鐧惧勾', content: '鍒板缓鍏氱櫨骞村叏闈㈠缓鎴愬皬搴凤紝鍒版柊涓浗鎴愮珛鐧惧勾寤烘垚鐜颁唬鍖栧己鍥姐€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓浗姊︾殑鎻愬嚭鑰呮槸', options: ['閭撳皬骞?, '姹熸辰姘?, '鑳￠敠娑?, '涔犺繎骞?], answerIndex: 3, explanation: '绠€鍗曪細2012骞村弬瑙傚鍏翠箣璺睍瑙堟彁鍑恒€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓浗姊︾殑鍩烘湰鍐呮兜鏄?, options: ['鍥藉瀵屽己銆佹皯鏃忔尟鍏淬€佷汉姘戝垢绂?, '瀹炵幇宸ヤ笟鍖?, '鎴愪负瓒呯骇澶у浗', '绉伴湼涓栫晫'], answerIndex: 0, explanation: '绠€鍗曪細鍥藉瀵屽己銆佹皯鏃忔尟鍏淬€佷汉姘戝垢绂忋€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓や釜涓€鐧惧勾濂嬫枟鐩爣锛岀涓€涓竴鐧惧勾鏄埌涓浗鍏变骇鍏氭垚绔嬩竴鐧惧勾鏃?, options: ['鍩烘湰瀹炵幇鐜颁唬鍖?, '鍏ㄩ潰寤烘垚灏忓悍绀句細', '寤烘垚鐜颁唬鍖栧己鍥?, '瀹炵幇鍏卞悓瀵岃'], answerIndex: 1, explanation: '绠€鍗曪細鍏ㄩ潰寤烘垚灏忓悍绀句細銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '绗簩涓竴鐧惧勾鐩爣鏄埌鏂颁腑鍥芥垚绔嬩竴鐧惧勾鏃?, options: ['瑙ｅ喅娓╅ケ', '鍏ㄩ潰寤烘垚灏忓悍', '寤烘垚瀵屽己姘戜富鏂囨槑鍜岃皭缇庝附鐨勭ぞ浼氫富涔夌幇浠ｅ寲寮哄浗', '瀹炵幇宸ヤ笟鍖?], answerIndex: 2, explanation: '涓瓑锛氬缓鎴愮幇浠ｅ寲寮哄浗銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '瀹炵幇涓浗姊︾殑鏍规湰璺緞鏄?, options: ['璧颁腑鍥介亾璺€佸紭鎵腑鍥界簿绁炪€佸嚌鑱氫腑鍥藉姏閲?, '鐓ф惉瑗挎柟妯″紡', '瀵瑰鎵╁紶', '鍏抽棬寤鸿'], answerIndex: 0, explanation: '涓瓑锛氫笁涓腑鍥姐€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '瀹炵幇涓浗姊﹀繀椤讳緷闈?, options: ['鏀垮簻鍗曠嫭瀹屾垚', '涓浗浜烘皯', '鍥介檯鎻村姪', '灏戞暟绮捐嫳'], answerIndex: 1, explanation: '涓瓑锛氫汉姘戞槸鍘嗗彶鍒涢€犺€呫€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屽疄鐜颁腑鍗庢皯鏃忎紵澶у鍏达紝灏辨槸涓崕姘戞棌杩戜唬浠ユ潵鏈€浼熷ぇ鐨勬ⅵ鎯炽€傘€嶈璁鸿堪鍑鸿嚜', options: ['閭撳皬骞?, '姹熸辰姘?, '鑳￠敠娑?, '涔犺繎骞?], answerIndex: 3, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼腑鍥芥ⅵ璁鸿堪銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓や釜涓€鐧惧勾鐩爣涔嬮棿鐨勫叧绯绘槸', options: ['褰兼瀛ょ珛', '鍓嶈€呮槸鍩虹锛屽悗鑰呮槸杩涗竴姝ョ洰鏍囷紝鍒嗘鎺ㄨ繘', '鍚屾椂瀹炵幇', '鐩镐簰鍚﹀畾'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽垎姝ヨ蛋鎴樼暐銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓浗姊﹀綊鏍瑰埌搴曟槸浜烘皯鐨勬ⅵ锛屽洜涓哄畠', options: ['鍙叧涔庡浗瀹?, '閫犵浜烘皯銆佺揣绱т緷闈犱汉姘戝疄鐜?, '涓庝釜浜烘棤鍏?, '鍙叧涔庢皯鏃?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼汉姘戜富浣撳湴浣嶃€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓哄疄鐜颁腑鍥芥ⅵ锛屾垜浠簲', options: ['鍧愪韩鍏舵垚', '鍩嬪ご鑻﹀共銆佹帴鍔涘鏂?, '绛夊緟澶栨彺', '鏀惧純鐞嗘兂'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽疄骞叉墠鑳芥ⅵ鎯虫垚鐪熴€? },
    ],
  },

  {
    id: 'g-his-8b-19', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗叚鍗曞厓 涓浗鐗硅壊绀句細涓讳箟杩涘叆鏂版椂浠?, edition: '缁熺紪鐗?, section: '绗?9璇?鍐宠儨鍏ㄩ潰寤烘垚灏忓悍绀句細',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?9璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡鍗佷節澶?, content: '2017骞寸‘绔嬩範杩戝钩鏂版椂浠ｄ腑鍥界壒鑹茬ぞ浼氫富涔夋€濇兂銆? },
      { id: 'kp2', title: '鑴辫传鏀诲潥', content: '鎵撹耽鑴辫传鏀诲潥鎴橈紝鍏ㄩ潰寤烘垚灏忓悍绀句細銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎶婁範杩戝钩鏂版椂浠ｄ腑鍥界壒鑹茬ぞ浼氫富涔夋€濇兂纭珛涓哄厷蹇呴』闀挎湡鍧氭寔鐨勬寚瀵兼€濇兂鐨勪細璁槸', options: ['涓叡鍗佸叓澶?, '涓叡鍗佷節澶?, '涓叡浜屽崄澶?, '涓叡鍗佷竷澶?], answerIndex: 1, explanation: '绠€鍗曪細2017骞村崄涔濆ぇ銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓浗鐗硅壊绀句細涓讳箟杩涘叆鏂版椂浠ｏ紝鎴戝浗绀句細涓昏鐭涚浘宸茬粡杞寲涓?, options: ['鏃犱骇闃剁骇涓庤祫浜ч樁绾х煕鐩?, '浜烘皯鏃ョ泭澧為暱鐨勭編濂界敓娲婚渶瑕佸拰涓嶅钩琛′笉鍏呭垎鐨勫彂灞曚箣闂寸殑鐭涚浘', '鍏堣繘涓庤惤鍚庣煕鐩?, '鏁屾垜鐭涚浘'], answerIndex: 1, explanation: '绠€鍗曪細鍗佷節澶т綔鍑烘柊鍒ゆ柇銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鑴辫传鏀诲潥鎴樺彇寰楀叏闈㈣儨鍒╂槸鍦?, options: ['2020骞村簳', '2012骞?, '2017骞?, '2035骞?], answerIndex: 0, explanation: '绠€鍗曪細2020骞村簳鐜拌鏍囧噯涓嬪啘鏉戣传鍥颁汉鍙ｅ叏閮ㄨ劚璐€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鑴辫传鏀诲潥鎴樹腑锛屽叏鍥?32涓传鍥板幙', options: ['鍏ㄩ儴鎽樺附', '閮ㄥ垎鎽樺附', '鍑忓皯涓€鍗?, '淇濇寔涓嶅彉'], answerIndex: 0, explanation: '涓瓑锛氬叏閮ㄦ憳甯姐€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鍗佷節澶ф寚鍑猴紝浠?020骞村埌2035骞达紝鎴戝浗鐨勫鏂楃洰鏍囨槸', options: ['鍏ㄩ潰寤烘垚灏忓悍绀句細', '鍩烘湰瀹炵幇绀句細涓讳箟鐜颁唬鍖?, '寤烘垚鐜颁唬鍖栧己鍥?, '瀹炵幇鍏卞悓瀵岃'], answerIndex: 1, explanation: '涓瓑锛氫袱姝ヨ蛋锛?035鍩烘湰瀹炵幇鐜颁唬鍖栥€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鎵撹耽鑴辫传鏀诲潥鎴樹綋鐜扮殑鍙戝睍鐞嗗康鏄?, options: ['鍏堟薄鏌撳悗娌荤悊', '鍏变韩鍙戝睍銆佸叡鍚屽瘜瑁?, '鏁堢巼浼樺厛', '鍙噸閫熷害'], answerIndex: 1, explanation: '涓瓑锛氫笉璁╀竴涓汉鎺夐槦銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岀粡杩?骞存寔缁鏂楋紝鎴戜滑濡傛湡瀹屾垚浜嗘柊鏃朵唬鑴辫传鏀诲潥鐩爣浠诲姟鈥︹€︺€嶈鎴愬氨', options: ['瑙ｅ喅浜嗙粷瀵硅传鍥伴棶棰?, '瀹炵幇浜嗗伐涓氬寲', '寤烘垚浜嗙幇浠ｅ寲寮哄浗', '瀹屾垚浜嗙鍥界粺涓€'], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾秷闄ょ粷瀵硅传鍥般€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涔犺繎骞虫柊鏃朵唬涓浗鐗硅壊绀句細涓讳箟鎬濇兂鍥炵瓟鐨勬椂浠ｈ棰樻槸', options: ['浠€涔堟槸绀句細涓讳箟銆佹€庢牱寤鸿绀句細涓讳箟', '寤鸿浠€涔堟牱鐨勫厷銆佹€庢牱寤鸿鍏?, '瀹炵幇浠€涔堟牱鐨勫彂灞曘€佹€庢牱鍙戝睍', '鏂版椂浠ｅ潥鎸佸拰鍙戝睍浠€涔堟牱鐨勪腑鍥界壒鑹茬ぞ浼氫富涔夈€佹€庢牱鍧氭寔鍜屽彂灞?], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽綋浠ｄ腑鍥介┈鍏嬫€濅富涔夈€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鑴辫传鏀诲潥鐨勪紵澶ф剰涔夋槸', options: ['瀹炵幇浜嗗悓姝ュ瘜瑁?, '鍘嗗彶鎬цВ鍐充簡缁濆璐洶闂锛屽桨鏄惧埗搴︿紭鍔?, '娑堥櫎浜嗗湴鍖哄樊璺?, '缁撴潫浜嗗垵绾ч樁娈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼互浜烘皯涓轰腑蹇冦€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍗佷竴灞婁笁涓叏浼氫笌涓叡鍗佷節澶э紝浜岃€呭叡鍚岀偣鏄?, options: ['閮藉湪寤哄浗鍒濇湡', '閮芥槸鍏锋湁閲岀▼纰戞剰涔夌殑浼氳', '閮界‘绔嬫瘺娉戒笢鎬濇兂', '閮界粨鏉熶簡鏃ф椂浠?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽巻鍙茶浆鎶樼偣銆? },
    ],
  },

  {
    id: 'g-his-8b-20', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗叚鍗曞厓 涓浗鐗硅壊绀句細涓讳箟杩涘叆鏂版椂浠?, edition: '缁熺紪鐗?, section: '绗?0璇?缁存姢鍥藉瀹夊叏鍜屾帹杩涚鍥界粺涓€',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鎬讳綋鍥藉瀹夊叏瑙?, content: '2014骞存彁鍑猴紝浠ヤ汉姘戝畨鍏ㄤ负瀹楁棬銆? },
      { id: 'kp2', title: '绁栧浗缁熶竴', content: '涓€鍥戒袱鍒讹紝涔濅簩鍏辫瘑锛屽弽鐙績缁熴€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎻愬嚭鎬讳綋鍥藉瀹夊叏瑙傜殑鏄?, options: ['閭撳皬骞?, '姹熸辰姘?, '鑳￠敠娑?, '涔犺繎骞?], answerIndex: 3, explanation: '绠€鍗曪細2014骞?鏈堟彁鍑恒€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鎬讳綋鍥藉瀹夊叏瑙傜殑瀹楁棬鏄?, options: ['鏀挎不瀹夊叏', '浜烘皯瀹夊叏', '缁忔祹瀹夊叏', '鍐涗簨瀹夊叏'], answerIndex: 1, explanation: '绠€鍗曪細浠ヤ汉姘戝畨鍏ㄤ负瀹楁棬銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '瀹炵幇绁栧浗缁熶竴鐨勫熀鏈柟閽堟槸', options: ['姝﹀姏瑙ｅ喅', '鍜屽钩缁熶竴銆佷竴鍥戒袱鍒?, '鑱旈偊鍒?, '楂樺害鑷不鍒嗘不'], answerIndex: 1, explanation: '绠€鍗曪細鍜屽钩缁熶竴銆佷竴鍥戒袱鍒躲€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '娴峰场涓ゅ哺鍏崇郴鐨勬斂娌诲熀纭€鏄?, options: ['涓€鍥戒袱鍒?, '涓€涓腑鍥藉師鍒欏拰涔濅簩鍏辫瘑', '涓夐€?, '姘戦棿浜ゆ祦'], answerIndex: 1, explanation: '涓瓑锛氫節浜屽叡璇嗗嵆涓€涓腑鍥藉師鍒欍€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鎬讳綋鍥藉瀹夊叏瑙傚己璋冭浠ヤ粈涔堜负鏍规湰', options: ['浜烘皯瀹夊叏', '鏀挎不瀹夊叏', '缁忔祹瀹夊叏', '鍥藉湡瀹夊叏'], answerIndex: 1, explanation: '涓瓑锛氭斂娌诲畨鍏ㄤ负鏍规湰銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鎴戜滑鍧氬喅鍙嶅鐨勫垎瑁傝寰勬槸', options: ['涓€鍥戒袱鍒?, '鍙扮嫭銆佹腐鐙瓑鍒嗚鍥藉琛屼负', '涓ゅ哺涓夐€?, '姘戦棿寰€鏉?], answerIndex: 1, explanation: '涓瓑锛氱淮鎶ゅ浗瀹朵富鏉冨拰棰嗗湡瀹屾暣銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾垜浠粷涓嶅厑璁镐换浣曚汉銆佷换浣曞娍鍔涗互浠讳綍鏂瑰紡鈥︹€︽妸浠讳綍涓€鍧椾腑鍥介鍦熶粠涓浗鍒嗚鍑哄幓銆傘€嶈繖琛ㄦ槑', options: ['鏀惧純鍜屽钩缁熶竴', '鍧氬畾缁存姢鍥藉涓绘潈鍜岄鍦熷畬鏁?, '姝︾粺涓哄厛', '鏆傛椂鎼佺疆缁熶竴'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽弽鍒嗚鍐冲績銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎬讳綋鍥藉瀹夊叏瑙傜殑鐗圭偣鏄?, options: ['鍙叧娉ㄥ啗浜?, '娑电洊鏀挎不銆佸浗鍦熴€佺粡娴庛€佺綉缁滅瓑澶氶鍩熺殑澶у畨鍏?, '鍙叧娉ㄥ浜?, '鍙叧娉ㄧ粡娴?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叏鏂逛綅鍥藉瀹夊叏銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝娓境鍥炲綊涓庝袱宀稿叧绯伙紝姝ｇ‘鐨勬槸', options: ['閮芥槸娈栨皯閬楃暀', '娓境鏄畺姘戦仐鐣欙紝鍙版咕鏄腑鍥藉唴鏀块棶棰橈紝缁堝皢缁熶竴', '鍙版咕宸茬嫭绔?, '涓ゅ哺宸茬粺涓€'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀鍥藉繀鐒剁粺涓€銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級缁存姢鍥藉瀹夊叏锛屽叕姘戝簲', options: ['浜嬩笉鍏冲繁', '鏍戠珛鎬讳綋鍥藉瀹夊叏瑙傘€佽嚜瑙夊饱琛岀淮鎶ゅ浗瀹跺畨鍏ㄤ箟鍔?, '娉勯湶鍥藉绉樺瘑', '鍙缁忔祹瀹夊叏鍗冲彲'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼汉浜烘湁璐ｃ€? },
    ],
  },

  {
    id: 'g-his-8b-21', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗叚鍗曞厓 涓浗鐗硅壊绀句細涓讳箟杩涘叆鏂版椂浠?, edition: '缁熺紪鐗?, section: '绗?1璇?鏋勫缓浜虹被鍛借繍鍏卞悓浣撲笌涓浗鐗硅壊澶у浗澶栦氦',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓€甯︿竴璺?, content: '2013骞存彁鍑猴紝鍏卞晢鍏卞缓鍏变韩銆? },
      { id: 'kp2', title: '浜虹被鍛借繍鍏卞悓浣?, content: '鍏ㄧ悆娌荤悊瑙傦紝涓浗鏂规銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '涓€甯︿竴璺€¤鎻愬嚭浜?, options: ['2001骞?, '2013骞?, '2017骞?, '2020骞?], answerIndex: 1, explanation: '绠€鍗曪細2013骞存彁鍑轰笣缁镐箣璺粡娴庡甫鍜?1涓栫邯娴蜂笂涓濈桓涔嬭矾銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鏋勫缓浜虹被鍛借繍鍏卞悓浣撶悊蹇电殑鎻愬嚭鑰呮槸', options: ['閭撳皬骞?, '姹熸辰姘?, '鑳￠敠娑?, '涔犺繎骞?], answerIndex: 3, explanation: '绠€鍗曪細涔犺繎骞虫彁鍑恒€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '涓€甯︿竴璺伒寰殑鍘熷垯鏄?, options: ['闇告潈涓诲', '鍏卞晢銆佸叡寤恒€佸叡浜?, '鎺掍粬灏侀棴', '闆跺拰鍗氬紙'], answerIndex: 1, explanation: '绠€鍗曪細鍏卞晢鍏卞缓鍏变韩銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏋勫缓浜虹被鍛借繍鍏卞悓浣擄紝寤鸿鐨勪笘鐣屾槸', options: ['闇告潈涓诲涓栫晫', '鎸佷箙鍜屽钩銆佹櫘閬嶅畨鍏ㄣ€佸叡鍚岀箒鑽ｃ€佸紑鏀惧寘瀹广€佹竻娲佺編涓界殑涓栫晫', '涓ゆ瀬鏍煎眬', '鍗曟瀬涓栫晫'], answerIndex: 1, explanation: '涓瓑锛氫簲涓笘鐣岀洰鏍囥€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓€甯︿竴璺殑閲嶈骞冲彴鏄?, options: ['鍗氶硨浜氭床璁哄潧', '涓€甯︿竴璺浗闄呭悎浣滈珮宄拌鍧?, 'APEC', 'G20'], answerIndex: 1, explanation: '涓瓑锛氶珮宄拌鍧涗績杩涘悎浣溿€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓浗鎻愬嚭鍏ㄧ悆娌荤悊瑙傛槸', options: ['闇告潈娌荤悊', '鍏卞晢鍏卞缓鍏变韩鐨勫叏鐞冩不鐞嗚', '澶у浗鍨勬柇', '鍗曡竟涓讳箟'], answerIndex: 1, explanation: '涓瓑锛氬叏鐞冩不鐞嗕腑鍥芥柟妗堛€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岃繖涓笘鐣岋紝鍚勫浗鐩镐簰鑱旂郴銆佺浉浜掍緷瀛樼殑绋嬪害绌哄墠鍔犳繁鈥︹€﹁秺鏉ヨ秺鎴愪负浣犱腑鏈夋垜銆佹垜涓湁浣犵殑鍛借繍鍏卞悓浣撱€傘€嶈鐞嗗康', options: ['鎺ㄥ姩鍏ㄧ悆娌荤悊鍙橀潻', '瀵艰嚧澶у浗瀵规姉', '鎭㈠娈栨皯绉╁簭', '寮曞彂鍐锋垬'], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼腑鍥芥櫤鎱с€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓€甯︿竴璺€¤鐨勯噸瑕佹剰涔夋槸', options: ['寤虹珛鍐涗簨鍚岀洘', '淇冭繘娌跨嚎鍥藉鍏卞悓鍙戝睍銆佸疄鐜板悎浣滃叡璧?, '杈撳嚭鎰忚瘑褰㈡€?, '寤虹珛鍔垮姏鑼冨洿'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼簰鑱斾簰閫氥€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浜虹被鍛借繍鍏卞悓浣撶悊蹇佃澶氭鍐欏叆鑱斿悎鍥芥枃浠讹紝璇存槑', options: ['涓浗涓诲鑱斿悎鍥?, '璇ョ悊蹇靛緱鍒板浗闄呯ぞ浼氬箍娉涜鍚?, '涓栫晫宸插疄鐜扮粺涓€', '鑱斿悎鍥界敱涓浗鎺у埗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼腑鍥芥柟妗堝奖鍝嶅姏銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏃т腑鍥藉眻杈卞浜や笌鏂版椂浠ｄ竴甯︿竴璺紝鏍规湰涓嶅悓鍦ㄤ簬', options: ['鏄惁涓庡鍥藉線鏉?, '鏄惁骞崇瓑浜掑埄銆佸悎浣滃叡璧?, '鏄惁鏈変娇鑺?, '鏄惁鍙傚姞鍥介檯浼氳'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叡浜箒鑽ｃ€? },
    ],
  },

  {
    id: 'g-his-8b-22', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竷鍗曞厓 鍏ㄩ潰寤鸿绀句細涓讳箟鐜颁唬鍖栧浗瀹?, edition: '缁熺紪鐗?, section: '绗?2璇?瀹炵幇绗竴涓櫨骞村鏂楃洰鏍?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍏ㄩ潰寤烘垚灏忓悍绀句細', content: '2021骞村甯冨疄鐜扮涓€涓櫨骞村鏂楃洰鏍囥€? },
      { id: 'kp2', title: '鍘嗗彶鎬ф垚灏?, content: '鑴辫传鏀诲潥銆佺粡娴庡彂灞曘€佸埗搴︽垚鐔熴€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎴戝浗瀹ｅ竷鍏ㄩ潰寤烘垚灏忓悍绀句細銆佸疄鐜扮涓€涓櫨骞村鏂楃洰鏍囨槸鍦?, options: ['2020骞?, '2021骞?, '2017骞?, '2035骞?], answerIndex: 1, explanation: '绠€鍗曪細2021骞?鏈?鏃ュ簞涓ュ鍛娿€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '绗竴涓櫨骞村鏂楃洰鏍囨槸鎸囧埌涓浗鍏变骇鍏氭垚绔?00骞存椂', options: ['鍩烘湰瀹炵幇鐜颁唬鍖?, '鍏ㄩ潰寤烘垚灏忓悍绀句細', '寤烘垚鐜颁唬鍖栧己鍥?, '瀹炵幇鍏卞悓瀵岃'], answerIndex: 1, explanation: '绠€鍗曪細鍏ㄩ潰寤烘垚灏忓悍绀句細銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍏ㄩ潰寤烘垚灏忓悍绀句細锛屽巻鍙叉€у湴瑙ｅ喅浜?, options: ['鐩稿璐洶闂', '缁濆璐洶闂', '鍦板尯鍙戝睍宸窛', '鍩庝埂宸埆'], answerIndex: 1, explanation: '绠€鍗曪細瑙ｅ喅缁濆璐洶銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '瀹炵幇绗竴涓櫨骞寸洰鏍囷紝鏍囧織鐫€鎴戝浗', options: ['杩涘叆鍙戣揪鍥藉琛屽垪', '韪忎笂瀹炵幇绗簩涓櫨骞寸洰鏍囨柊寰佺▼', '瀹屾垚浜嗙幇浠ｅ寲', '娑堥櫎浜嗕竴鍒囧樊璺?], answerIndex: 1, explanation: '涓瓑锛氫箻鍔胯€屼笂寮€鍚柊寰佺▼銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍏ㄩ潰寤烘垚灏忓悍绀句細锛屾渶鑹板法鏈€绻侀噸鐨勪换鍔″湪', options: ['鍩庡競', '鍐滄潙', '涓滈儴', '宸ヤ笟'], answerIndex: 1, explanation: '涓瓑锛氫笁鍐滄槸閲嶄腑涔嬮噸銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '绗竴涓櫨骞寸洰鏍囩殑瀹炵幇锛屾牴鏈笂寰楃泭浜?, options: ['鍥介檯鎻村姪', '涓浗鍏变骇鍏氶瀵煎拰绀句細涓讳箟鍒跺害', '鍜屽钩鐨勫浗闄呯幆澧?, '缁忔祹鍏ㄧ悆鍖?], answerIndex: 1, explanation: '涓瓑锛氬埗搴︿紭鍔裤€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾垜浠疄鐜颁簡绗竴涓櫨骞村鏂楃洰鏍囷紝鍦ㄤ腑鍗庡ぇ鍦颁笂鍏ㄩ潰寤烘垚浜嗗皬搴风ぞ浼氣€︹€︺€嶈瀹ｅ憡', options: ['鏍囧織鑴辫传鏀诲潥鑳滃埄銆佸巻鍙叉€цВ鍐崇粷瀵硅传鍥?, '瀹炵幇浜嗙幇浠ｅ寲', '瀹屾垚浜嗙鍥界粺涓€', '寤烘垚浜嗙幇浠ｅ寲寮哄浗'], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼紵澶у厜鑽ｃ€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級绗竴涓櫨骞寸洰鏍囦笌绗簩涓櫨骞寸洰鏍囩殑鍏崇郴鏄?, options: ['浜掍笉鐩稿共', '鍓嶈€呬负鍚庤€呭瀹氬熀纭€锛屾帴缁鏂?, '鍚屾椂瀹屾垚', '鍚庤€呭惁瀹氬墠鑰?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼袱姝ヨ蛋鎴樼暐銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍏ㄩ潰寤烘垚灏忓悍绀句細鐨勭粡楠岃鏄?, options: ['鍙戝睍鍙互涓€姝ュ埌浣?, '鍧氭寔浠ヤ汉姘戜负涓績銆侀泦涓姏閲忓姙澶т簨', '鍙渶缁忔祹澧為暱', '蹇借鐢熸€佷繚鎶?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽埗搴︿紭鍔裤€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級浠庣珯璧锋潵銆佸瘜璧锋潵鍒板己璧锋潵锛屾纭殑鎺掑簭鏄?, options: ['鏀归潻寮€鏀锯€斺€旀柊涓浗鎴愮珛鈥斺€旀柊鏃朵唬', '鏂颁腑鍥芥垚绔嬧€斺€旀敼闈╁紑鏀锯€斺€斾腑鍥界壒鑹茬ぞ浼氫富涔夋柊鏃朵唬', '鏂版椂浠ｂ€斺€旀敼闈╁紑鏀锯€斺€斿缓鍥?, '寤哄浗鈥斺€旀柊鏃朵唬鈥斺€旀敼闈╁紑鏀?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笁娆′紵澶ч璺冦€? },
    ],
  },

  {
    id: 'g-his-8b-23', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竷鍗曞厓 鍏ㄩ潰寤鸿绀句細涓讳箟鐜颁唬鍖栧浗瀹?, edition: '缁熺紪鐗?, section: '绗?3璇?寮€鍚叏闈㈠缓璁剧ぞ浼氫富涔夌幇浠ｅ寲鍥藉鏂板緛绋?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?3璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓叡浜屽崄澶?, content: '2022骞村彫寮€锛屾摌鐢讳腑鍥藉紡鐜颁唬鍖栧畯浼熻摑鍥俱€? },
      { id: 'kp2', title: '涓浗寮忕幇浠ｅ寲', content: '浜哄彛瑙勬ā宸ㄥぇ銆佸叏浣撲汉姘戝叡鍚屽瘜瑁曘€佺墿璐ㄧ簿绁炲崗璋冦€佷汉涓庤嚜鐒跺拰璋愬叡鐢熴€佽蛋鍜屽钩鍙戝睍閬撹矾銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎿樼敾鍏ㄩ潰寤鸿绀句細涓讳箟鐜颁唬鍖栧浗瀹跺畯浼熻摑鍥剧殑浼氳鏄?, options: ['涓叡鍗佷節澶?, '涓叡浜屽崄澶?, '涓叡鍗佸叓澶?, '涓叡鍗佷竷澶?], answerIndex: 1, explanation: '绠€鍗曪細2022骞翠腑鍏变簩鍗佸ぇ銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '涓浗寮忕幇浠ｅ寲鏄?, options: ['瑗挎柟鍥藉鐜颁唬鍖栫殑缈荤増', '涓浗鍏变骇鍏氶瀵肩殑绀句細涓讳箟鐜颁唬鍖?, '娈栨皯鎵╁紶寮忕幇浠ｅ寲', '涓ゆ瀬鍒嗗寲鐨勭幇浠ｅ寲'], answerIndex: 1, explanation: '绠€鍗曪細绀句細涓讳箟鐜颁唬鍖栥€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓浗寮忕幇浠ｅ寲鐨勭壒寰佷笉鍖呮嫭', options: ['浜哄彛瑙勬ā宸ㄥぇ', '鍏ㄤ綋浜烘皯鍏卞悓瀵岃', '鐗╄川鏂囨槑鍜岀簿绁炴枃鏄庣浉鍗忚皟', '瀵瑰渚电暐鎵╁紶'], answerIndex: 3, explanation: '绠€鍗曪細璧板拰骞冲彂灞曢亾璺€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '浠?020骞村埌2035骞达紝鎴戝浗鐨勫鏂楃洰鏍囨槸', options: ['鍏ㄩ潰寤烘垚灏忓悍绀句細', '鍩烘湰瀹炵幇绀句細涓讳箟鐜颁唬鍖?, '寤烘垚鐜颁唬鍖栧己鍥?, '瀹炵幇鍏卞悓瀵岃'], answerIndex: 1, explanation: '涓瓑锛氫袱姝ヨ蛋锛?035鍩烘湰瀹炵幇鐜颁唬鍖栥€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍒版湰涓栫邯涓彾锛屾垜鍥借寤烘垚', options: ['灏忓悍绀句細', '瀵屽己姘戜富鏂囨槑鍜岃皭缇庝附鐨勭ぞ浼氫富涔夌幇浠ｅ寲寮哄浗', '宸ヤ笟鍥?, '鍐滀笟鍥?], answerIndex: 1, explanation: '涓瓑锛氱浜屼釜鐧惧勾鐩爣銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '涓叡浜屽崄澶ф姤鍛婃寚鍑猴紝鍏ㄩ潰寤鸿绀句細涓讳箟鐜颁唬鍖栧浗瀹剁殑棣栬浠诲姟鏄?, options: ['鍙戝睍閫熷害', '楂樿川閲忓彂灞?, '鏀归潻寮€鏀?, '绉戞妧鍒涙柊'], answerIndex: 1, explanation: '涓瓑锛氶珮璐ㄩ噺鍙戝睍鏄瑕佷换鍔°€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼腑鍥藉紡鐜颁唬鍖栵紝鏄腑鍥藉叡浜у厷棰嗗鐨勭ぞ浼氫富涔夌幇浠ｅ寲鈥︹€︽棦鏈夊悇鍥界幇浠ｅ寲鐨勫叡鍚岀壒寰侊紝鏇存湁鍩轰簬鑷繁鍥芥儏鐨勪腑鍥界壒鑹层€傘€嶈璁鸿堪鍑鸿嚜', options: ['鍗佷節澶?, '浜屽崄澶ф姤鍛?, '鍗佷竷澶?, '鍗佸叚澶?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼簩鍗佸ぇ绮剧銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝瑗挎柟鐜颁唬鍖栦笌涓浗寮忕幇浠ｅ寲锛屼腑鍥藉紡鐜颁唬鍖栫殑鐙壒涔嬪鏄?, options: ['閮介€氳繃娈栨皯鎺犲ず', '璧板拰骞冲彂灞曢亾璺€佸疄鐜板叡鍚屽瘜瑁?, '閮戒袱鏋佸垎鍖?, '閮藉澶栨墿寮?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽尯鍒簬瑗挎柟鑰佽矾銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓叡浜屽崄澶х殑閲嶈鎰忎箟鏄?, options: ['寮€鍚簡鏀归潻寮€鏀?, '绉戝璋嬪垝鏈潵浜斿勾涔冭嚦鏇撮暱鏃舵湡鍏氬拰鍥藉浜嬩笟鍙戝睍鐨勭洰鏍囦换鍔?, '纭珛绀句細涓讳箟鍒跺害', '鎭㈠鑱斿悎鍥藉腑浣?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽杩涙柊寰佺▼銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓浗寮忕幇浠ｅ寲鐨勬牴鏈繚璇佹槸', options: ['鍥介檯鎻村姪', '鍧氭寔涓浗鍏变骇鍏氶瀵?, '鐓ф惉瑗挎柟妯″紡', '鍗曟墦鐙枟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽厷鐨勯瀵兼槸鏍规湰銆? },
    ],
  },

  {
    id: 'g-his-8b-24', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竷鍗曞厓 鍏ㄩ潰寤鸿绀句細涓讳箟鐜颁唬鍖栧浗瀹?, edition: '缁熺紪鐗?, section: '绗?4璇?娲诲姩璇?鏂版椂浠ｇぞ浼氱敓娲荤殑宸ㄥぇ鍙樺寲',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-8b', locator: '绗?4璇? },
    knowledgePoints: [
      { id: 'kp1', title: '琛ｉ浣忚鍙樺寲', content: '浠庤传鍥板埌娓╅ケ鍒板皬搴凤紝娑堣垂鍗囩骇銆? },
      { id: 'kp2', title: '绉戞妧涓庣ぞ浼氬彉杩?, content: '浜掕仈缃戙€佺Щ鍔ㄦ敮浠樸€侀珮閾佹繁鍒绘敼鍙樼敓娲汇€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鏀归潻寮€鏀惧悗锛屼汉姘戦ギ椋熺粨鏋勫彂鐢熺殑鍙樺寲鏄?, options: ['鍙眰鍚冮ケ', '璁茬┒钀ュ吇鍧囪　銆佺豢鑹插仴搴?, '鍙悆绮楃伯', '渚濊禆杩涘彛椋熷搧'], answerIndex: 1, explanation: '绠€鍗曪細浠庡悆楗卞埌鍚冨ソ銆佸悆寰楀仴搴枫€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '娣卞埢鏀瑰彉浜轰滑鍑鸿鏂瑰紡銆佽绉颁负涓浗鏂板洓澶у彂鏄庝箣涓€鐨勬槸', options: ['椹溅', '楂橀搧', '杞埞', '鑷杞?], answerIndex: 1, explanation: '绠€鍗曪細楂橀搧缂╃煭鏃剁┖璺濈銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏋佸ぇ鏀瑰彉浜轰滑鏀粯鏂瑰紡鐨勬妧鏈槸', options: ['鐜伴噾鏀粯', '绉诲姩鏀粯', '鏀エ鏀粯', '浠ョ墿鏄撶墿'], answerIndex: 1, explanation: '绠€鍗曪細绉诲姩鏀粯鏅強銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '浠庣エ璇佹椂浠ｅ埌绉诲姩鏀粯鏃朵唬锛屽弽鏄犵殑鏈川鏄?, options: ['绉戞妧杩涙銆佺粡娴庡彂灞?, '浜轰滑鍙樻噿', '璐у竵璐€?, '閫氳儉鍔犲墽'], answerIndex: 0, explanation: '涓瓑锛氱敓浜у姏澶у彂灞曘€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '浜掕仈缃戞櫘鍙婂悗锛屼汉浠殑璐墿鏂瑰紡鍙樹负', options: ['鍙幓瀹炰綋搴?, '缃戣喘鎴愪负閲嶈鏂瑰紡', '鍙€涢泦甯?, '鍙嚟绁ㄤ緵搴?], answerIndex: 1, explanation: '涓瓑锛氱數瀛愬晢鍔″叴璧枫€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鏂版椂浠ｇぞ浼氫繚闅滃埗搴︾殑鍙戝睍琛ㄧ幇涓?, options: ['鍙鐩栧煄甯?, '寤虹珛瑕嗙洊鍩庝埂鐨勭ぞ浼氫繚闅滀綋绯?, '鍙栨秷绀句繚', '鍙繚鍏亴浜哄憳'], answerIndex: 1, explanation: '涓瓑锛氬叏姘戠ぞ淇濄€佸簲淇濆敖淇濄€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽嚭闂ㄤ竴閮ㄦ墜鏈猴紝鎵爜涔樿溅銆佽喘鐗┿€佸氨鍖烩€︹€︺€嶈繖鍙嶆槧浜?, options: ['璁″垝缁忔祹', '绉戞妧杩涙娣卞埢鏀瑰彉鐢熸椿鏂瑰紡', '闂叧閿佸浗', '鐗╄祫鍖箯'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼簰鑱旂綉+鐢熸椿銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏀归潻寮€鏀句互鏉ヤ汉姘戠敓娲诲彉鍖栫殑鎬讳綋瓒嬪娍鏄?, options: ['浠庤传鍥板埌娓╅ケ鍐嶅埌鎬讳綋灏忓悍銆佸叏闈㈠皬搴?, '闀挎湡鍋滄粸涓嶅墠', '閫愭笎涓嬮檷', '鍏堥檷鍚庡崌'], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀敓娲绘按骞充笉鏂彁楂樸€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏀归潻寮€鏀惧墠涓庢柊鏃朵唬锛屼笅鍒楄娉曟纭殑鏄?, options: ['鍙樺寲涓嶅ぇ', '绉戞妧涓庣ぞ浼氱敓娲诲彂鐢熶簡鍘嗗彶鎬у法鍙?, '鍙槸琛ｆ湇鍙樺ソ鐪?, '鍙槸椋熺墿鍙樺'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叏鏂逛綅宸ㄥ彉銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏂版椂浠ｇぞ浼氱敓娲诲法澶у彉鍖栫殑鏍规湰鍘熷洜鏄?, options: ['鍥介檯鎻村姪', '鏀归潻寮€鏀捐В鏀惧拰鍙戝睍浜嗙敓浜у姏', '鑷劧鏉′欢浼樿秺', '浜哄彛绾㈠埄'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼腑鍥界壒鑹茬ぞ浼氫富涔夐亾璺纭€? },
    ],
  },

  {
    id: 'g-his-9a-1', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鏂囨槑鐨勪骇鐢熷拰鍙や唬浜氶潪鏂囨槑', edition: '缁熺紪鐗?, section: '绗?璇?浠庡師濮嬬ぞ浼氬埌濂撮毝绀句細',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍘熷绀句細', content: '鏃х煶鍣ㄣ€佹柊鐭冲櫒锛屾皬鏃忓叕绀撅紝鐢熶骇鍔涗綆涓嬨€? },
      { id: 'kp2', title: '濂撮毝绀句細', content: '绉佹湁鍒躲€侀樁绾с€佸浗瀹朵骇鐢燂紝杩涘叆鏂囨槑鏃朵唬銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '浜虹被鏈€鏃╀娇鐢ㄧ殑宸ュ叿涓昏鏄?, options: ['闈掗摐鍣?, '鎵撳埗鐭冲櫒', '閾佸櫒', '闄跺櫒'], answerIndex: 1, explanation: '绠€鍗曪細鏃х煶鍣ㄦ椂浠ｆ墦鍒剁煶鍣ㄣ€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍘熷绀句細鐢熶骇鍏崇郴鐨勫熀纭€鏄?, options: ['绉佹湁鍒?, '鐢熶骇璧勬枡鍏湁', '濂撮毝鍒?, '灏佸缓鍦扮'], answerIndex: 1, explanation: '绠€鍗曪細鍏卞悓鍔冲姩銆佸钩鍧囧垎閰嶃€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '浜虹被绀句細绗竴娆＄ぞ浼氬ぇ鍒嗗伐鏄?, options: ['鍐滀笟鍜岀暅鐗т笟鍒嗙', '鎵嬪伐涓氬拰鍐滀笟鍒嗙', '鍟嗕笟鐙珛', '鑴戝姏鍔冲姩涓庝綋鍔涘姵鍔ㄥ垎绂?], answerIndex: 0, explanation: '绠€鍗曪細鐣滅墽閮ㄨ惤浠庡啘涓氶儴钀藉垎绂汇€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '绉佹湁鍒朵骇鐢熺殑鏍规湰鍘熷洜鏄?, options: ['鎴樹簤鎺犲ず', '鐢熶骇鍔涘彂灞曘€佸墿浣欎骇鍝佸嚭鐜?, '姘忔棌棣栭璐┆', '鍥藉浜х敓'], answerIndex: 1, explanation: '涓瓑锛氱敓浜у姏鍙戝睍鏄牴婧愩€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '浜虹被杩涘叆鏂囨槑鏃朵唬鐨勬爣蹇楁槸', options: ['鎵撳埗鐭冲櫒', '閲戝睘宸ュ叿銆佹枃瀛椼€佸浗瀹跺嚭鐜?, '鐢ㄧ伀', '瀹氬眳'], answerIndex: 1, explanation: '涓瓑锛氬ゴ闅剁ぞ浼氬彇浠ｅ師濮嬬ぞ浼氭槸鍘嗗彶杩涙銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍥藉浜х敓鐨勬牴鏈師鍥犳槸', options: ['浜轰滑绾﹀畾', '闃剁骇鐭涚浘涓嶅彲璋冨拰', '閮ㄨ惤鑱旂洘', '绀句細濂戠害'], answerIndex: 1, explanation: '涓瓑锛氶樁绾х煕鐩句笉鍙皟鍜岀殑浜х墿銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽湪鍘熷绀句細锛屼汉浠叡鍚屽姵鍔紝骞冲潎鍒嗛厤鈥︹€﹀悗鏉ワ紝闅忕潃鐢熶骇鍔涚殑鍙戝睍锛屽嚭鐜颁簡鍓╀綑浜у搧锛屾皬鏃忛棰嗗紑濮嬫妸鍏墿鍗犱负宸辨湁銆傘€嶈鏉愭枡璇存槑', options: ['绉佹湁鍒朵粠鏉ュ氨鏈?, '绉佹湁鍒舵槸鐢熶骇鍔涘彂灞曞埌涓€瀹氶樁娈电殑浜х墿', '鍏湁鍒舵案鎭?, '鍥藉浠庢潵灏辨湁'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀鏈夊埗璧锋簮銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級濂撮毝绀句細浠ｆ浛鍘熷绀句細鏄巻鍙茬殑杩涙锛屼富瑕佸洜涓哄畠', options: ['鍑虹幇浜嗗墺鍓?, '閫傚簲骞朵績杩涗簡鐢熶骇鍔涘彂灞?, '娑堢伃浜嗛樁绾?, '瀹炵幇浜嗕汉浜哄钩绛?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽垽鏂爣鍑嗘槸鐢熶骇鍔涖€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍘熷绀句細涓庡ゴ闅剁ぞ浼氾紝鍚庤€呯殑杩涙鎬ц〃鐜板湪', options: ['娌℃湁鍓ュ墛', '寤虹珛浜嗗浗瀹躲€佸垱閫犱簡鏂囧瓧鍜屾枃鏄?, '浜轰汉骞崇瓑', '骞冲潎鍒嗛厤'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繄鍏ユ枃鏄庨棬妲涖€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏂扮煶鍣ㄦ椂浠ｄ笌鏃х煶鍣ㄦ椂浠ｇ浉姣旓紝閲嶅ぇ杩涙鏄?, options: ['浣跨敤鎵撳埗鐭冲櫒', '纾ㄥ埗鐭冲櫒銆佸師濮嬪啘涓氬拰鐣滅墽涓氫骇鐢?, '瀛︿細鐢ㄧ伀', '鍑虹幇鍥藉'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀敓浜у姏椋炶穬銆? },
    ],
  },

  {
    id: 'g-his-9a-2', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鏂囨槑鐨勪骇鐢熷拰鍙や唬浜氶潪鏂囨槑', edition: '缁熺紪鐗?, section: '绗?璇?鍙や唬涓ゆ渤娴佸煙',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓ゆ渤鏂囨槑', content: '骞煎彂鎷夊簳娌炽€佸簳鏍奸噷鏂渤锛岃嫃缇庡皵浜恒€? },
      { id: 'kp2', title: '姹夎盁鎷夋瘮娉曞吀', content: '鍙ゅ反姣斾鸡鐜嬪浗锛岃縿浠婂凡鐭ョ涓€閮ㄨ緝涓哄畬鏁寸殑鎴愭枃娉曞吀銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍙や唬涓ゆ渤娴佸煙浣嶄簬浠婂ぉ鐨?, options: ['鍩冨強', '浼婃媺鍏嬪鍐?, '鍗板害', '涓浗'], answerIndex: 1, explanation: '绠€鍗曪細缇庣储涓嶈揪绫充簹骞冲師銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓ゆ渤娴佸煙鐨勮嫃缇庡皵浜哄彂鏄庣殑鏂囧瓧鏄?, options: ['璞″舰鏂囧瓧', '妤斿舰鏂囧瓧', '鐢查鏂?, '瀛楁瘝鏂囧瓧'], answerIndex: 1, explanation: '绠€鍗曪細妤斿舰鏂囧瓧銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍙ゅ反姣斾鸡鐜嬪浗鐨勫浗鐜嬫槸', options: ['鑳″か', '姹夎盁鎷夋瘮', '鍥剧壒鎽╂柉', '浼噷鍏嬪埄'], answerIndex: 1, explanation: '绠€鍗曪細姹夎盁鎷夋瘮缁熶竴涓ゆ渤娴佸煙銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '杩勪粖宸茬煡涓栫晫涓婄涓€閮ㄨ緝涓哄畬鏁寸殑鎴愭枃娉曞吀鏄?, options: ['銆婂崄浜岄摐琛ㄦ硶銆?, '銆婃眽璋熸媺姣旀硶鍏搞€?, '銆婃煡澹竵灏兼硶鍏搞€?, '銆婃嬁鐮翠粦娉曞吀銆?], answerIndex: 1, explanation: '涓瓑锛氬埢鍦ㄩ粦鑹茬煶鏌变笂銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '銆婃眽璋熸媺姣旀硶鍏搞€嬬淮鎶ょ殑鏄?, options: ['濂撮毝鐨勫埄鐩?, '濂撮毝涓婚樁绾х殑鍒╃泭', '骞虫皯鍒╃泭', '鍏ㄤ綋灞呮皯鍒╃泭'], answerIndex: 1, explanation: '涓瓑锛氶樁绾хぞ浼氭硶寰嬫湰璐ㄣ€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '涓ゆ渤娴佸煙鐨勪汉浠埗瀹氱殑鍘嗘硶鏄?, options: ['澶槼鍘?, '澶槾鍘?, '鍏巻', '鍐滃巻'], answerIndex: 1, explanation: '涓瓑锛氬お闃村巻鍜屾槦鏈熷埗搴︺€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽鏋滀竴涓汉姣佷簡鍙︿竴涓汉鐨勭溂鐫涳紝浜轰滑搴旀瘉浜嗕粬鐨勭溂鐫涳紱濡傛灉浠栨姌鏂簡涓€涓汉鐨勯澶达紝浜轰滑搴旀姌鏂粬鐨勯澶淬€傘€嶈鏉℃枃鍑鸿嚜', options: ['銆婃眽璋熸媺姣旀硶鍏搞€?, '銆婂崄浜岄摐琛ㄦ硶銆?, '銆婃皯娉曞吀銆?, '銆婂彜鍏扮粡銆?], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼互鐪艰繕鐪煎師鍒欍€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婃眽璋熸媺姣旀硶鍏搞€嬬殑鍘嗗彶鍦颁綅鏄?, options: ['涓栫晫涓婃渶鏃╃殑娉曞緥', '杩勪粖宸茬煡绗竴閮ㄨ緝涓哄畬鏁寸殑鎴愭枃娉曞吀', '鏈€姘戜富鐨勬硶寰?, '鐜颁唬娉曞緥婧愬ご'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾硶鍒朵紶缁熻捣婧愩€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍙や唬涓ゆ渤娴佸煙鏂囨槑鎴愭灉涓嶅寘鎷?, options: ['妤斿舰鏂囧瓧', '澶槾鍘?, '60杩涗綅鍒?, '閲戝瓧濉?], answerIndex: 3, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄噾瀛楀灞炲彜鍩冨強銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝銆婃眽璋熸媺姣旀硶鍏搞€嬩笌鐜颁唬娉曞緥锛屽墠鑰呮湰璐ㄦ槸', options: ['淇濇姢鍏ㄤ綋鍏皯', '缁存姢濂撮毝涓婚樁绾х粺娌诲伐鍏?, '浜轰汉骞崇瓑', '淇濇姢濂撮毝'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾硶寰嬮樁绾ф€с€? },
    ],
  },

  {
    id: 'g-his-9a-3', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鏂囨槑鐨勪骇鐢熷拰鍙や唬浜氶潪鏂囨槑', edition: '缁熺紪鐗?, section: '绗?璇?鍙や唬鍩冨強',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '灏肩綏娌充笌鏂囨槑', content: '灏肩綏娌冲瓡鑲插彜鍩冨強锛屽凹缃楁渤鐨勮禒绀笺€? },
      { id: 'kp2', title: '閲戝瓧濉斾笌璞″舰鏂囧瓧', content: '娉曡€侀櫟澧擄紝鏉冨姏璞″緛銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '瀛曡偛鍙ゅ焹鍙婃枃鏄庣殑娌虫祦鏄?, options: ['骞煎彂鎷夊簳娌?, '灏肩綏娌?, '鍗板害娌?, '榛勬渤'], answerIndex: 1, explanation: '绠€鍗曪細灏肩綏娌冲畾鏈熸硾婊ャ€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鍙ゅ焹鍙婃硶鑰佺殑闄靛琚О涓?, options: ['绌轰腑鑺卞洯', '閲戝瓧濉?, '甯曠壒鍐滅搴?, '闆呭吀濞滃コ绁炲簷'], answerIndex: 1, explanation: '绠€鍗曪細閲戝瓧濉旀槸娉曡€侀櫟澧撱€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鍙ゅ焹鍙婁汉鍒涘埗鐨勬枃瀛楁槸', options: ['妤斿舰鏂囧瓧', '璞″舰鏂囧瓧', '瀛楁瘝鏂囧瓧', '鐢查鏂?], answerIndex: 1, explanation: '绠€鍗曪細璞″舰鏂囧瓧銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍙ゅ焹鍙婃渶澶х殑閲戝瓧濉旀槸', options: ['鍝堝紬鎷夐噾瀛楀', '鑳″か閲戝瓧濉?, '闂ㄥ崱涔屾媺閲戝瓧濉?, '闃舵閲戝瓧濉?], answerIndex: 1, explanation: '涓瓑锛氳儭澶噾瀛楀銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '閲戝瓧濉旂殑宸ㄥぇ瑙勬ā锛屾渶鑳借鏄?, options: ['鍙ゅ焹鍙婁汉淇＄', '娉曡€佺殑鏃犻檺鏉冨姏鍜屽ゴ闅跺姵鍔ㄧ殑缁撴櫠', '鏃呮父璧勬簮涓板瘜', '寤虹瓚鎶€鏈厛杩涙棤鍏?], answerIndex: 1, explanation: '涓瓑锛氬ゴ闅朵富濂村焦浜烘皯鐨勮璇併€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鍙ゅ焹鍙婁汉鍒跺畾鐨勮憲鍚嶅巻娉曟槸', options: ['闃村巻', '澶槼鍘?, '鍏巻', '鍐滃巻'], answerIndex: 1, explanation: '涓瓑锛氬お闃冲巻鏄汉绫绘渶鏃╃殑澶槼鍘嗕箣涓€銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屽焹鍙婃槸灏肩綏娌崇殑璧犵ぜ銆傘€嶈繖鍙ヨ瘽鐨勫惈涔夋槸', options: ['灏肩綏娌冲彂婧愪簬鍩冨強', '灏肩綏娌冲瓡鑲蹭簡鍙ゅ焹鍙婃枃鏄?, '鍩冨強娌℃湁鍏朵粬娌虫祦', '灏肩綏娌虫槸浜哄伐杩愭渤'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾渤娴佷笌鏂囨槑鍏崇郴銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級閲戝瓧濉旂殑鍘嗗彶浠峰€兼槸', options: ['鍙ゅ焹鍙婂啗浜嬪己澶?, '鏄彜鍩冨強鏂囨槑鐨勮薄寰併€佸弽鏄犵ぞ浼氱粡娴庡彂灞曟按骞?, '璇佹槑浜轰汉骞崇瓑', '璇存槑濂撮毝鍒跺凡娑堜骸'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笘鐣屽杩广€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍙ゅ焹鍙婁笌涓ゆ渤娴佸煙鏂囨槑锛屼簩鑰呭叡鍚岀偣鏄?, options: ['閮藉彂婧愪簬澶ф渤娴佸煙', '閮戒娇鐢ㄦ褰㈡枃瀛?, '閮戒互閲戝瓧濉旇憲绉?, '閮戒綅浜庝粖澶╃殑浼婃媺鍏?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽ぇ娌虫枃鏄庣壒寰併€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鑳″か閲戝瓧濉旂殑淇缓锛屽弽鏄犱簡鍙ゅ焹鍙婄ぞ浼?, options: ['浜轰汉骞崇瓑', '娉曡€佸叿鏈夋棤闄愭潈鍔涖€佸ゴ闅跺埗鐨勫己鐩?, '娌℃湁闃剁骇鍒嗗寲', '寤虹瓚浠ユ湪澶翠负涓?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笓鍒剁帇鏉冦€? },
    ],
  },

  {
    id: 'g-his-9a-4', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鏂囨槑鐨勪骇鐢熷拰鍙や唬浜氶潪鏂囨槑', edition: '缁熺紪鐗?, section: '绗?璇?鍙や唬鍗板害',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍗板害娌虫枃鏄?, content: '鍝堟媺甯曘€佹懇浜ㄤ綈路杈剧綏鍩庡競鏂囨槑銆? },
      { id: 'kp2', title: '绉嶅鍒跺害涓庝經鏁?, content: '濠嗙綏闂ㄣ€佸埞甯濆埄銆佸悹鑸嶃€侀闄€缃楋紱鍓?涓栫邯閲婅喀鐗熷凹鍒涚珛浣涙暀銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鍙や唬鍗板害鏃╂湡鏂囨槑鍙戠ゥ浜?, options: ['鎭掓渤娴佸煙', '鍗板害娌虫祦鍩?, '灏肩綏娌虫祦鍩?, '涓ゆ渤娴佸煙'], answerIndex: 1, explanation: '绠€鍗曪細鍗板害娌冲搱鎷夊笗鏂囨槑銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鍙や唬鍗板害鐨勭瓑绾у埗搴﹁绉颁负', options: ['鍒嗗皝鍒?, '绉嶅鍒跺害', '閲囬倯鍒?, '琛岀渷鍒?], answerIndex: 1, explanation: '绠€鍗曪細涓ユ牸鐨勭瓑绾у埗搴︺€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '浣涙暀鐨勫垱濮嬩汉鏄?, options: ['绌嗙綍榛樺痉', '涔旇揪鎽┞锋倝杈惧锛堥噴杩︾墴灏硷級', '鑰剁ǎ', '瀛斿瓙'], answerIndex: 1, explanation: '绠€鍗曪細鍏厓鍓?涓栫邯銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '绉嶅鍒跺害涓紝鎺岀瀹楁暀绁鐨勬槸', options: ['鍒瑰笣鍒?, '濠嗙綏闂?, '鍚犺垗', '棣栭檧缃?], answerIndex: 1, explanation: '涓瓑锛氬﹩缃楅棬绗竴绛夌骇銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '绉嶅鍒跺害涓紝鎺岀鍐涗簨鍜岃鏀挎潈鍔涚殑鏄?, options: ['濠嗙綏闂?, '鍒瑰笣鍒?, '鍚犺垗', '棣栭檧缃?], answerIndex: 1, explanation: '涓瓑锛氬浗鐜嬨€佹澹睘鍒瑰笣鍒┿€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '浣涙暀鍒涚珛鍚庯紝鏃╂湡涓昏鍙嶅', options: ['濠嗙綏闂ㄧ壒鏉?, '鍒瑰笣鍒╃粺娌?, '濂撮毝鍒跺害', '鐜嬫潈'], answerIndex: 0, explanation: '涓瓑锛氭彁鍑轰紬鐢熷钩绛夈€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼汉鐨勭敓銆佹銆佽吹銆佽幢鈥︹€﹂兘鏄鐢ㄤ笉鍚岀殑涓滆タ閫犲嚭鏉ョ殑銆傚槾閫犱簡濠嗙綏闂紝鎵嬮€犱簡鍒瑰笣鍒┾€︹€︺€嶈鏉愭枡鍙嶆槧鐨勫埗搴︽槸', options: ['绂呰鍒?, '绉嶅鍒跺害', '鍒嗗皝鍒?, '绉戜妇鍒?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀瓑绾ф．涓ャ€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绉嶅鍒跺害鐨勫疄璐ㄦ槸', options: ['姘戜富鍒跺害', '涓ユ牸鐨勭ぞ浼氱瓑绾у埗搴︺€佺淮鎶ゅゴ闅朵富缁熸不', '姘戞棌鑷不鍒跺害', '瀹楁暀鑷敱鏀跨瓥'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃吹璐卞垎鏄庛€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浣涙暀寰椾互浼犳挱鐨勫師鍥犱箣涓€鏄?, options: ['瀹ｆ壃鏆村姏', '鎻愬嚭蹇嶈€愰『浠庛€佷紬鐢熷钩绛夛紝寰楀埌涓嬪眰鍜屽浗鐜嬫敮鎸?, '涓诲紶绉嶅骞崇瓑', '鍙嶅鐜嬫潈'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叕鍏冨墠鍚庝紶鍏ヤ腑鍥姐€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍙ゅ嵃搴︾濮撳埗搴︿笌鍙や唬涓浗绉戜妇鍒讹紝鍓嶈€?, options: ['浠ユ墠閫夊畼', '鑱屼笟涓栬銆佺瓑绾у嚌鍥恒€佷笉鍙法瓒?, '鏈轰細鍧囩瓑', '闈㈠悜鍏ㄦ皯'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀瓑绾у鍨掋€? },
    ],
  },

  {
    id: 'g-his-9a-5', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 鍙や唬娆ф床鏂囨槑', edition: '缁熺紪鐗?, section: '绗?璇?鍙や唬甯岃厞',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '甯岃厞鍩庨偊', content: '灏忓浗瀵℃皯锛岄泤鍏搞€佹柉宸磋揪鏈€钁楀悕銆? },
      { id: 'kp2', title: '闆呭吀姘戜富鏀挎不', content: '浼噷鍏嬪埄鏃朵唬杈惧埌椤跺嘲锛屾垚骞寸敺鎬у叕姘戝弬鏀裤€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '甯岃厞鏈€鏃╃殑鏂囨槑浜х敓浜?, options: ['灏肩綏娌虫祦鍩?, '鐖辩惔娴峰湴鍖?, '涓ゆ渤娴佸煙', '鍗板害娌虫祦鍩?], answerIndex: 1, explanation: '绠€鍗曪細鍏嬮噷鐗广€佽繄閿″凹鏂囨槑銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '甯岃厞鍩庨偊鐨勭獊鍑虹壒鐐规槸', options: ['鐤嗗煙杈介様', '灏忓浗瀵℃皯', '浜哄彛浼楀', '涓ぎ闆嗘潈'], answerIndex: 1, explanation: '绠€鍗曪細灏忓浗瀵℃皯銆佺嫭绔嬭嚜涓汇€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '闆呭吀姘戜富鏀挎不杈惧埌鏋佺洓鏃舵湡鐨勬墽鏀垮畼鏄?, options: ['姊鸡', '浼噷鍏嬪埄', '鍏嬮噷鏂彁灏?, '浜氬巻灞卞ぇ'], answerIndex: 1, explanation: '绠€鍗曪細鍏厓鍓?涓栫邯涓悗鏈熴€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '闆呭吀鍩庨偊鐨勬渶楂樻潈鍔涙満鏋勬槸', options: ['浜旂櫨浜轰細璁?, '鍏皯澶т細', '闄娉曞涵', '鍗佸皢鍐涘鍛樹細'], answerIndex: 1, explanation: '涓瓑锛氬叏浣撴垚骞寸敺鎬у叕姘戝弬鍔犮€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍦ㄩ泤鍏革紝鐪熸鏈夋潈鍙傛斂鐨勬槸', options: ['鍏ㄤ綋灞呮皯', '鎴愬勾鐢锋€у叕姘?, '濂撮毝', '濡囧コ'], answerIndex: 1, explanation: '涓瓑锛氬閭︿汉銆佸ゴ闅躲€佸濂宠鎺掗櫎銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鏂反杈惧煄閭︾殑鐗圭偣鏄?, options: ['姘戜富鏀挎不', '宕囧皻姝﹀姏銆佽吹鏃忓啗浜嬬粺娌?, '鍟嗕笟鍙戣揪', '鏂囧寲绻佽崳'], answerIndex: 1, explanation: '涓瓑锛氫笌闆呭吀褰㈡垚瀵规瘮銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾垜浠殑鍒跺害涔嬫墍浠ヨ绉颁负姘戜富鏀挎不锛屽洜涓烘斂鏉冩槸鍦ㄥ叏浣撳叕姘戞墜涓€傘€嶈瑷€璁哄嚭鑷?, options: ['浼噷鍏嬪埄', '鍑拻', '灞嬪ぇ缁?, '浜氬巻灞卞ぇ'], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄泤鍏告皯涓汇€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闆呭吀姘戜富鏀挎不鐨勮繘姝ユ€у湪浜?, options: ['浜轰汉骞崇瓑', '寮€鍒涗簡姘戜富鏀挎不鐨勫吀鑼冦€佸鍚庝笘褰卞搷娣辫繙', '缁存姢濂撮毝鍒╃泭', '濡囧コ鍙傛斂'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃タ鏂规皯涓绘簮澶淬€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闆呭吀姘戜富鏀挎不鐨勫眬闄愭€ф槸', options: ['娌℃湁鏉冨姏鏈烘瀯', '鏈川鏄ゴ闅朵富姘戜富銆佸閭︿汉濂撮毝濡囧コ鏃犳潈', '浜轰汉骞崇瓑', '娌℃湁娉曞緥'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽皯鏁颁汉鐨勬皯涓汇€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝闆呭吀涓庢柉宸磋揪锛屾纭殑鏄?, options: ['閮藉疄琛屾皯涓?, '闆呭吀閲嶆皯涓绘枃鍖栥€佹柉宸磋揪灏氭鍐涗簨', '閮藉缓绔嬪笣鍥?, '閮藉疄琛屽笣鍒?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽煄閭﹀樊寮傘€? },
    ],
  },

  {
    id: 'g-his-9a-6', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簩鍗曞厓 鍙や唬娆ф床鏂囨槑', edition: '缁熺紪鐗?, section: '绗?璇?鍙や唬缃楅┈',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '缃楅┈鍏卞拰鍥?, content: '鍏厓鍓?09骞村缓绔嬶紝銆婂崄浜岄摐琛ㄦ硶銆嬨€? },
      { id: 'kp2', title: '缃楅┈甯濆浗', content: '鍏厓鍓?7骞村眿澶х淮寤虹珛锛?涓栫邯鍦拌法涓夋床銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '缃楅┈鍏卞拰鍥藉缓绔嬩簬', options: ['鍏厓鍓?09骞?, '鍏厓鍓?7骞?, '鍏厓476骞?, '鍏厓鍓?34骞?], answerIndex: 0, explanation: '绠€鍗曪細缃楅┈鍏卞拰鍥姐€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '缃楅┈棰佸竷鐨勭涓€閮ㄦ垚鏂囨硶鏄?, options: ['銆婃眽璋熸媺姣旀硶鍏搞€?, '銆婂崄浜岄摐琛ㄦ硶銆?, '銆婃煡澹竵灏兼硶鍏搞€?, '銆婃嬁鐮翠粦娉曞吀銆?], answerIndex: 1, explanation: '绠€鍗曪細銆婂崄浜岄摐琛ㄦ硶銆嬨€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '缃楅┈甯濆浗鐨勫缓绔嬭€呮槸', options: ['鍑拻', '灞嬪ぇ缁?, '浜氬巻灞卞ぇ', '浼噷鍏嬪埄'], answerIndex: 1, explanation: '绠€鍗曪細鍏厓鍓?7骞村眿澶х淮銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '缃楅┈甯濆浗杩涘叆榛勯噾鏃舵湡銆佸湴璺ㄦ浜氶潪涓夋床鏄湪', options: ['鍏厓鍓?涓栫邯', '2涓栫邯', '鍏厓鍓?涓栫邯', '5涓栫邯'], answerIndex: 1, explanation: '涓瓑锛氬湴涓捣鎴愪负鍐呮箹銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '缃楅┈鍏卞拰鍥芥椂鏈燂紝鎺屾彙鍥藉缁熸不鍐崇瓥鏉冪殑鏄?, options: ['鍏皯澶т細', '鍏冭€侀櫌', '鎵ф斂瀹?, '淇濇皯瀹?], answerIndex: 1, explanation: '涓瓑锛氳吹鏃忓厓鑰侀櫌銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '瑗跨綏椹笣鍥界伃浜′簬', options: ['鍏厓鍓?7骞?, '鍏厓476骞?, '395骞?, '1453骞?], answerIndex: 1, explanation: '涓瓑锛氳タ娆уゴ闅剁ぞ浼氱粨鏉熴€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾潯鏉″ぇ璺€氱綏椹€傘€嶈繖鍙ヨ皻璇弽鏄犱簡', options: ['缃楅┈閬撹矾淇缓鏈€鏃?, '缃楅┈甯濆浗寮虹洓銆佺枂鍩熻窘闃斻€佷氦閫氬彂杈?, '缃楅┈鍙槸涓€搴у煄', '缃楅┈鍟嗕笟钀藉悗'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽笣鍥界箒鑽ｃ€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級銆婂崄浜岄摐琛ㄦ硶銆嬬殑閲嶈鎰忎箟鏄?, options: ['涓栫晫鏈€鏃╂硶寰?, '浣块噺鍒戝畾缃湁浜嗘枃瀛椾緷鎹€佹槸缃楅┈娉曞彂灞曠殑璧风偣', '缁存姢濂撮毝鍒╃泭', '鐜颁唬瀹硶'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾硶鍒朵紶缁熴€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝缃楅┈鍏卞拰鍥戒笌缃楅┈甯濆浗锛屽悗鑰呯殑鐗圭偣鏄?, options: ['璐垫棌鍏卞拰', '瀹炶鍐涗簨甯濆埗銆佺枂鍩熺┖鍓嶆墿澶?, '灏忓浗瀵℃皯', '姘戜富鏀挎不'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼粠鍏卞拰鍒板笣鍥姐€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缃楅┈甯濆浗2涓栫邯鍦拌法涓夋床锛屽湴涓捣鎴愪负鍐呮箹锛岃繖璇存槑', options: ['缃楅┈浜烘槸鏈€鏃╃殑鑸捣瀹?, '缃楅┈杩涘叆寮虹洓鏃舵湡銆佺増鍥捐揪鍒版渶澶?, '缃楅┈鏄啘涓氬浗', '缃楅┈浠嶅眬闄愪簬鎰忓ぇ鍒╁崐宀?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽ぇ鍥藉礇璧枫€? },
    ],
  },

  {
    id: 'g-his-9a-7', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 灏佸缓鏃朵唬鐨勬娲?, edition: '缁熺紪鐗?, section: '绗?璇?娉曞叞鍏嬬帇鍥藉拰瑗挎灏佸缓鍒跺害',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '娉曞叞鍏嬬帇鍥戒笌鏌ョ悊鏇煎笣鍥?, content: '鍏嬫礇缁村缓鍥斤紝800骞存煡鐞嗘浖绉板笣銆? },
      { id: 'kp2', title: '灏佸悰灏佽嚕鍒?, content: '浠ュ湡鍦板皝璧愪负绾藉甫锛屽眰灞傚垎灏併€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '娉曞叞鍏嬬帇鍥界殑寤虹珛鑰呮槸', options: ['灞嬪ぇ缁?, '鍏嬫礇缁?, '鏌ョ悊鏇?, '浜氬巻灞卞ぇ'], answerIndex: 1, explanation: '绠€鍗曪細鍏嬫礇缁寸殘渚濆熀鐫ｆ暀銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鏌ョ悊鏇煎笣鍥藉垎瑁備负涓夐儴鍒嗭紝濂犲畾浜嗗摢涓夊浗闆忓舰', options: ['鑻辨硶寰?, '寰锋剰蹇椼€佹硶鍏拌タ銆佹剰澶у埄', '鑻辨剰瑗?, '寰峰ゥ鎰?], answerIndex: 1, explanation: '绠€鍗曪細843骞淬€婂嚒灏旂櫥鏉＄害銆嬨€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '瑗挎灏佸缓鍒跺害鐨勭航甯︽槸', options: ['琛€缂?, '鍦熷湴鐨勫皝璧?, '瀹楁暀淇′话', '鍐涘姛'], answerIndex: 1, explanation: '绠€鍗曪細灏佸悰灏佽嚕浠ュ湡鍦颁负绾藉甫銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '瑗挎灏佸缓绛夌骇鍒朵腑锛屽眳浜庢渶搴曞眰鐨勬槸', options: ['鍏埖', '楠戝＋', '鍐滃ゴ', '鍥界帇'], answerIndex: 2, explanation: '涓瓑锛氬啘濂存槸琚墺鍓婇樁绾с€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鏌ョ悊鏇艰鍔犲啎涓虹綏椹汉鐨勭殗甯濇槸鍦?, options: ['751骞?, '800骞?, '843骞?, '962骞?], answerIndex: 1, explanation: '涓瓑锛?00骞村湥璇炶妭銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '灏佸悰涓庡皝鑷ｅ叧绯荤殑绾藉甫鏄?, options: ['閲戦挶', '鍦熷湴灏佽祼銆佹潈鍔涗笌涔夊姟鐩镐簰浜ょ粐', '琛€缂?, '鎴樹簤'], answerIndex: 1, explanation: '涓瓑锛氭垜鐨勯檮搴哥殑闄勫焊涓嶆槸鎴戠殑闄勫焊銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾垜鐨勯檮搴哥殑闄勫焊锛屼笉鏄垜鐨勯檮搴搞€傘€嶈繖鍙ヨ瘽鍙嶆槧浜嗚タ娆?, options: ['涓ぎ闆嗘潈', '灏佸缓绛夌骇鍒跺害涓嬶紝灏佽嚕鍙晥鍛界洿鎺ュ皝鍚?, '浜轰汉骞崇瓑', '閮″幙鍒?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽眰绾у垎灏併€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級瑗挎灏佸缓鍒跺害鐨勬牳蹇冩槸', options: ['閮″幙鍒?, '灏佸悰灏佽嚕鍒跺害', '绉戜妇鍒?, '琛岀渷鍒?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽湡鍦板垎灏併€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏌ョ悊鏇煎笣鍥戒笌缃楅┈甯濆浗锛屽墠鑰?, options: ['鏄湴璺ㄤ笁娲插ぇ甯濆浗', '鏄タ娆ф棭鏈熷皝寤虹帇鍥姐€佸悗鏉ュ垎瑁?, '浠ュ湴涓捣涓哄唴婀?, '瀹炶濂撮毝鍒?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽皝寤烘椂浠ｃ€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級瑗挎灏佸缓绛夌骇鍒朵笌鍙や唬涓浗鍒嗗皝鍒剁殑鐩镐技鐐规槸', options: ['閮戒互琛€缂樹负涓?, '閮戒互鍦熷湴鍒嗗皝銆佸舰鎴愬眰灞傜瓑绾?, '閮戒腑澶泦鏉?, '閮借閮″幙'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽垎灏佸叡鎬с€? },
    ],
  },

  {
    id: 'g-his-9a-8', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 灏佸缓鏃朵唬鐨勬娲?, edition: '缁熺紪鐗?, section: '绗?璇?瑗挎鐨勫煄甯傚拰澶у',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍩庡競鍏磋捣', content: '10涓栫邯璧凤紝鎵嬪伐涓氬拰鍟嗕笟鍩庡競澶嶈嫃銆? },
      { id: 'kp2', title: '澶у鍏磋捣', content: '涓笘绾ぇ瀛﹁璁や负鏄娲蹭腑涓栫邯鏁欒偛鏈€缇庡ソ鐨勮姳鏈点€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '瑗挎鍩庡競閲嶆柊鍏磋捣浜?, options: ['5涓栫邯', '10涓栫邯', '14涓栫邯', '16涓栫邯'], answerIndex: 1, explanation: '绠€鍗曪細10涓栫邯璧枫€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍩庡競灞呮皯浜夊彇鑷不鐨勫父鐢ㄦ墜娈垫槸', options: ['姝﹀姏鎺ㄧ炕鍥界帇', '閲戦挶璧庝拱鍜屾鍔涙枟浜?, '绛夊緟鎭╄祼', '鑱斿悎鏁欎細'], answerIndex: 1, explanation: '绠€鍗曪細鐞呭煄甯傛皯璧蜂箟鍏稿瀷銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '琚涓烘槸娆ф床涓笘绾暀鑲叉渶缇庡ソ鐨勮姳鏈电殑鏄?, options: ['鏁欎細瀛︽牎', '涓笘绾ぇ瀛?, '绉佸【', '瀹环瀛︽牎'], answerIndex: 1, explanation: '绠€鍗曪細澶у鍏磋捣銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '瑗挎鍩庡競鍏磋捣涓紝閫愭笎褰㈡垚鐨勬柊闃剁骇鏄?, options: ['鍦颁富闃剁骇', '甯傛皯闃剁骇', '鍐滄皯闃剁骇', '濂撮毝闃剁骇'], answerIndex: 1, explanation: '涓瓑锛氭棭鏈熻祫浜ч樁绾у墠韬€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鍩庡競浜夊彇鑷不锛屽吀鍨嬩唬琛ㄦ槸', options: ['濞佸凹鏂?, '鐞呭煄', '浼︽暒', '宸撮粠'], answerIndex: 1, explanation: '涓瓑锛氱悈鍩庤捣涔夈€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓笘绾ぇ瀛︾殑鑷不鍦颁綅涓昏浣撶幇鍦?, options: ['鍏嶈祴绋庛€佸徃娉曠壒鏉冦€佹暀鑲茶嚜涓绘潈', '涓嶅彈浠讳綍绾︽潫', '鍙彈鏁欎細鎺у埗', '瀹屽叏鑷不'], answerIndex: 0, explanation: '涓瓑锛氬ぇ瀛﹁嚜娌汇€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屽煄甯傜殑绌烘皵浣夸汉鑷敱銆傘€嶈繖鍙ヨ皻璇鏄?, options: ['鍩庡競绌烘皵鏂伴矞', '鍐滃ゴ鍦ㄤ綇婊′竴骞撮浂涓€澶╁悗鍙幏寰楄嚜鐢?, '鍩庡競娌℃湁鍐滄皯', '鍩庡競浜轰汉骞崇瓑'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽煄甯傝В鏀惧啘濂淬€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級瑗挎鍩庡競鍏磋捣鐨勫巻鍙叉剰涔夋槸', options: ['瀹炵幇浜嗗浗瀹剁粺涓€', '浜х敓浜嗗競姘戦樁绾э紝涓鸿祫鏈富涔夊叴璧峰噯澶囦簡鏉′欢', '娑堢伃浜嗗皝寤哄埗搴?, '寤虹珛浜嗗叡鍜屽浗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀ぞ浼氳浆鍨嬨€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓笘绾ぇ瀛﹀叴璧风殑涓昏浣滅敤鏄?, options: ['鍩瑰吇鏁欎細鍍т荆', '鎵撶牬鏁欎細瀵规暀鑲插瀯鏂€佸煿鍏荤ぞ浼氶渶瑕佺殑浜烘墠', '鍙暀绁炲', '涓庣幇浠ｅぇ瀛︽棤鍏?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鍖栦紶鎵裤€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓彜瑗挎鍩庡競涓庡悓鏃舵湡涓浗鍩庡競锛屽墠鑰呯壒鐐规槸', options: ['閮藉彈瀹樺簻涓ユ牸鎺у埗', '澶氭嫢鏈夎嚜娌绘潈銆佸瓡鑲叉棭鏈熻祫浜ч樁绾?, '閮芥槸鏀挎不涓績', '娌℃湁鍟嗕笟娲诲姩'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼腑瑗垮樊寮傘€? },
    ],
  },

  {
    id: 'g-his-9a-9', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗笁鍗曞厓 灏佸缓鏃朵唬鐨勬娲?, edition: '缁熺紪鐗?, section: '绗?璇?鎷滃崰搴笣鍥?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '甯濆浗鍏磋“', content: '涓滅綏椹笣鍥斤紝1453骞磋濂ユ柉鏇兼墍鐏€? },
      { id: 'kp2', title: '銆婃煡澹竵灏兼硶鍏搞€?, content: '銆婄綏椹皯娉曞ぇ鍏ㄣ€嬶紝娆ф床娉曞鍩虹銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎷滃崰搴笣鍥藉嵆', options: ['瑗跨綏椹笣鍥?, '涓滅綏椹笣鍥?, '浜氬巻灞卞ぇ甯濆浗', '娉曞叞鍏嬬帇鍥?], answerIndex: 1, explanation: '绠€鍗曪細瀹氶兘鍚涘＋鍧︿竵鍫°€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鎷滃崰搴笣鍥界伃浜′簬', options: ['476骞?, '843骞?, '1453骞?, '1640骞?], answerIndex: 2, explanation: '绠€鍗曪細濂ユ柉鏇煎湡鑰冲叾鏀婚櫡鍚涘＋鍧︿竵鍫°€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '缁勭粐缂栨挵銆婃煡澹竵灏兼硶鍏搞€嬬殑鐨囧笣鏄?, options: ['灞嬪ぇ缁?, '鏌ュ＋涓佸凹', '鍏嬫礇缁?, '鏌ョ悊鏇?], answerIndex: 1, explanation: '绠€鍗曪細529骞撮甯冦€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婄綏椹皯娉曞ぇ鍏ㄣ€嬪寘鎷?, options: ['銆婃煡澹竵灏兼硶鍏搞€嬨€婃硶瀛︽眹绾傘€嬨€婃硶鐞嗘瑕併€嬨€婃柊娉曞吀銆?, '鍙湁涓€閮ㄦ硶鍏?, '銆婂崄浜岄摐琛ㄦ硶銆?, '銆婃眽璋熸媺姣旀硶鍏搞€?], answerIndex: 0, explanation: '涓瓑锛氬洓閮ㄦ枃鐚悎绉般€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鎷滃崰搴笣鍥借涓嬪垪鍝釜鍥藉鎵€鐏?, options: ['闃挎媺浼笣鍥?, '濂ユ柉鏇煎笣鍥?, '娉曞叞鍏嬬帇鍥?, '浜氬巻灞卞ぇ甯濆浗'], answerIndex: 1, explanation: '涓瓑锛?453骞淬€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '銆婄綏椹皯娉曞ぇ鍏ㄣ€嬬殑鍘嗗彶鍦颁綅鏄?, options: ['涓栫晫涓婃渶鏃╃殑娉曞緥', '濂犲畾浜嗘娲叉皯娉曠殑鍩虹', '鐜颁唬瀹硶', '鍙€傜敤浜庣綏椹?], answerIndex: 1, explanation: '涓瓑锛氭硶瀛︽笂婧愩€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€?453骞达紝濂ユ柉鏇煎湡鑰冲叾浜烘敾闄峰悰澹潶涓佸牎锛屽崈骞村笣鍥界伃浜°€傘€嶈鍗冨勾甯濆浗鏄?, options: ['瑗跨綏椹笣鍥?, '鎷滃崰搴笣鍥?, '闃挎媺浼笣鍥?, '鏌ョ悊鏇煎笣鍥?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼笢缃楅┈缁堢粨銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婄綏椹皯娉曞ぇ鍏ㄣ€嬬殑娣辫繙褰卞搷鏄?, options: ['缁存姢浜嗗ゴ闅跺埄鐩?, '鎴愪负杩戜唬娆ф床鍚勫浗娉曞緥鐨勫熀纭€', '鍙湪鎷滃崰搴€傜敤', '鐜颁唬宸叉棤褰卞搷'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾硶鍒朵紶缁熴€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎷滃崰搴笣鍥界伃浜＄殑涓昏鍘熷洜鏄?, options: ['澶栨晫鍏ヤ镜', '灏侀棴淇濆畧銆侀櫠閱変簬宸叉湁鐨勬垚灏便€佷笉灞戝涔犳柊浜嬬墿', '缁忔祹鍙戣揪', '鍐涗簨寮哄ぇ'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽紑鏀惧垯鍏淬€佷繚瀹堝垯浜°€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鎷滃崰搴笣鍥戒笌鍚屾椂鏈熻タ娆э紝鎷滃崰搴獊鍑鸿础鐚槸', options: ['澶嶅叴浜嗗ゴ闅跺埗', '淇濆瓨浜嗗彜甯岃厞缃楅┈鏂囧寲銆佷负瑗挎鏂囪壓澶嶅叴鎻愪緵鍩虹', '寤虹珛浜嗘柊瀹楁暀', '鍙戞槑浜嗛€犵焊鏈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鍖栨ˉ姊併€? },
    ],
  },

  {
    id: 'g-his-9a-10', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓彜鏃舵湡鐨勪簹娲层€侀潪娲插拰缇庢床', edition: '缁熺紪鐗?, section: '绗?0璇?灏佸缓鏃朵唬鐨勬棩鏈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '澶у寲鏀规柊', content: '646骞村瓭寰峰ぉ鐨囦豢鏁堝攼鏈濓紝寤虹珛涓ぎ闆嗘潈銆? },
      { id: 'kp2', title: '姝﹀＋涓庡箷搴?, content: '姝﹀＋闆嗗洟锛?2涓栫邯鏈暟浠撳箷搴溿€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鏃ユ湰浠挎晥鍞愭湞杩涜鐨勬敼闈╂槸', options: ['澶у寲鏀规柊', '鏄庢不缁存柊', '鍐滃ゴ鍒舵敼闈?, '鍊掑箷杩愬姩'], answerIndex: 0, explanation: '绠€鍗曪細646骞村ぇ鍖栨敼鏂般€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '澶у寲鏀规柊鐨勪富鎸佽€呮槸', options: ['寰峰窛瀹跺悍', '瀛濆痉澶╃殗', '鏄庢不澶╃殗', '婧愯禆鏈?], answerIndex: 1, explanation: '绠€鍗曪細瀛︿範鍞愭湞鍏哥珷銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '澶у寲鏀规柊浣挎棩鏈彂灞曟垚涓?, options: ['濂撮毝鍒跺浗瀹?, '涓ぎ闆嗘潈鍒剁殑灏佸缓鍥藉', '鑱旈偊鍒跺浗瀹?, '鍐涗簨鍏卞拰鍥?], answerIndex: 1, explanation: '绠€鍗曪細绀句細鎬ц川杞彉銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏃ユ湰杩涘叆骞曞簻缁熸不鏃舵湡濮嬩簬', options: ['646骞?, '12涓栫邯鏈?, '17涓栫邯', '19涓栫邯'], answerIndex: 1, explanation: '涓瓑锛氶暟浠撳箷搴溿€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鏃ユ湰姝﹀＋鏁堝繝鐨勫璞℃槸', options: ['鍥藉', '涓诲叕', '澶╃殗', '骞曞簻灏嗗啗'], answerIndex: 1, explanation: '涓瓑锛氭澹亾绮剧銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '澶у寲鏀规柊涓紝鍦ㄧ粡娴庝笂鏁堟硶鍞愭湞瀹炶', options: ['鐝敯鏀舵巿娉曘€佺搴歌皟鍒?, '鍐滃ゴ鍒?, '搴勫洯鍒?, '灞敯鍒?], answerIndex: 0, explanation: '涓瓑锛氬湡鍦板浗鏈夈€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屽ぇ鍖栨敼鏂版爣蹇楃潃鏃ユ湰浠庡ゴ闅剁ぞ浼氳繃娓″埌灏佸缓绀句細銆傘€嶈繖涓€缁撹鐨勪富瑕佷緷鎹槸', options: ['鏃ユ湰杩侀兘', '鎵撶牬姘忔棌璐垫棌鐗规潈銆佸缓绔嬩腑澶泦鏉冨皝寤哄埗搴?, '姝﹀＋鍑虹幇', '浣涙暀浼犲叆'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀ぞ浼氭€ц川鍙樺寲銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級澶у寲鏀规柊瀵规棩鏈殑鏈€閲嶈褰卞搷鏄?, options: ['璧颁笂浜嗚祫鏈富涔夐亾璺?, '浣挎棩鏈彂灞曟垚涓轰腑澶泦鏉冨埗灏佸缓鍥藉', '璧颁笂浜嗘畺姘戞墿寮犻亾璺?, '纭珛浜嗘澹亾'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽皝寤哄寲杞瀷銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝澶у寲鏀规柊涓庢槑娌荤淮鏂帮紝浜岃€呭叡鍚岀偣鏄?, options: ['閮藉彧瀛︿範涓浗', '閮戒富鍔ㄥ涔犲厛杩涙枃鏄庛€佸疄鐜扮ぞ浼氳浆鍨?, '閮藉涔犳缇?, '閮藉彂鐢熷湪19涓栫邯'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾棩鏈杽浜庡涔犮€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏃ユ湰骞曞簻缁熸不鏃舵湡锛屾帉鎻″疄鏉冪殑鏄?, options: ['澶╃殗', '骞曞簻灏嗗啗', '澶у悕', '姝﹀＋'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽ぉ鐨囧ぇ鏉冩梺钀姐€? },
    ],
  },

  {
    id: 'g-his-9a-11', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓彜鏃舵湡鐨勪簹娲层€侀潪娲插拰缇庢床', edition: '缁熺紪鐗?, section: '绗?1璇?闃挎媺浼笣鍥?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '浼婃柉鍏版暀鍏磋捣', content: '7涓栫邯鍒濈﹩缃曢粯寰峰湪楹﹀姞鍒涚珛銆? },
      { id: 'kp2', title: '闃挎媺浼枃鍖?, content: '缈昏瘧杩愬姩銆併€婂ぉ鏂瑰璋€嬨€佹暟瀛椾紶鎾€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '浼婃柉鍏版暀鐨勫垱绔嬭€呮槸', options: ['绌嗙綍榛樺痉', '鑰剁ǎ', '閲婅喀鐗熷凹', '鎽╄タ'], answerIndex: 0, explanation: '绠€鍗曪細7涓栫邯鍒濋害鍔犮€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '浼婃柉鍏版暀鐨勭粡鍏告槸', options: ['銆婂湥缁忋€?, '銆婂彜鍏扮粡銆?, '銆婅棌缁忋€?, '銆婅璇€?], answerIndex: 1, explanation: '绠€鍗曪細銆婂彜鍏扮粡銆嬨€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '闃挎媺浼崐宀涘熀鏈粺涓€浜?, options: ['622骞?, '630骞?, '632骞?, '750骞?], answerIndex: 2, explanation: '绠€鍗曪細绌嗙綍榛樺痉閫濅笘鏃躲€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鎶婂嵃搴︽暟瀛楁敼閫犲苟浼犳挱鍒版娲茬殑鏄?, options: ['鍙ゅ笇鑵婁汉', '闃挎媺浼汉', '鍙ょ綏椹汉', '娉㈡柉浜?], answerIndex: 1, explanation: '涓瓑锛氶樋鎷変集鏁板瓧銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '闃挎媺浼皯闂存晠浜嬮泦鏄?, options: ['銆婅嵎椹彶璇椼€?, '銆婂ぉ鏂瑰璋€嬶紙銆婁竴鍗冮浂涓€澶溿€嬶級', '銆婁紛绱㈠瘬瑷€銆?, '銆婃牸鏋楃璇濄€?], answerIndex: 1, explanation: '涓瓑锛氫笘鐣屾枃瀛﹀悕钁椼€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '622骞寸﹩缃曢粯寰疯縼灞呴害鍦伴偅锛岃繖涓€骞村悗鏉ユ垚涓?, options: ['浼婃柉鍏版暀鍘嗗厓骞?, '闃挎媺浼笣鍥藉缓绔?, '楹﹀姞鏈濊', '鍗佸瓧鍐涘紑濮?], answerIndex: 0, explanation: '涓瓑锛氫紛鏂叞鏁欏巻鍏冨勾銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼腑鍥戒汉鐨勭瑪銆佸笇鑵婁汉鐨勭溂鍔涖€侀樋鎷変集浜虹殑鍙ｆ墠鈥︹€︺€嶉樋鎷変集浜哄湪涓滆タ鏂规枃鍖栦氦娴佷腑鍏呭綋鐨勮鑹叉槸', options: ['琚姩鎺ュ彈鑰?, '娌熼€氫笢瑗挎柟鏂囧寲鐨勪娇鑰?, '鏂囧寲姣佺伃鑰?, '瀛ょ珛闂叧鑰?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾ˉ姊佷綔鐢ㄣ€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級浼婃柉鍏版暀鐨勫垱绔嬪闃挎媺浼崐宀涚殑閲嶈浣滅敤鏄?, options: ['瀵艰嚧鍒嗚', '淇冭繘浜嗛樋鎷変集鍗婂矝鐨勭粺涓€', '寮曞彂鍐呮垬', '浣垮崐宀涙畺姘戝寲'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼竴绁炴暀鍑濊仛浜哄績銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闃挎媺浼汉瀵逛笘鐣屾枃鍖栫殑鐙壒璐＄尞鏄?, options: ['鍙戞槑閫犵焊鏈?, '淇濆瓨骞朵紶鎾簡鍙ゅ吀鏂囧寲銆佹垚涓轰笢瑗挎柟鏂囧寲浜ゆ祦妗ユ', '鍒涚珛浣涙暀', '鍙戞槑钂告苯鏈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鍖栦娇鑰呫€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝闃挎媺浼笣鍥戒笌鍚屾椂鏈熷攼甯濆浗锛屼簩鑰呭叡鍚岀偣鏄?, options: ['閮戒互鍩虹潱鏁欎负鍥芥暀', '閮藉垱閫犱簡杈夌厡鏂囧寲銆佸湴澶勪笢瑗挎柟浜ゆ祦瑕侀亾', '閮藉疄琛屽ゴ闅跺埗', '閮界伃浜′簬1453骞?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾枃鏄庝氦娴併€? },
    ],
  },

  {
    id: 'g-his-9a-12', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗洓鍗曞厓 涓彜鏃舵湡鐨勪簹娲层€侀潪娲插拰缇庢床', edition: '缁熺紪鐗?, section: '绗?2璇?涓彜鏃舵湡鐨勯潪娲插拰缇庢床',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '闈炴床鏂囨槑', content: '妗戞捣銆佸ぇ娲ュ反甯冮煢绛夊彜鍥姐€? },
      { id: 'kp2', title: '缇庢床鏂囨槑', content: '鐜涢泤銆侀樋鍏圭壒鍏嬨€佸嵃鍔犳枃鏄庛€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '瑗块潪寮虹洓鐨勫笣鍥藉寘鎷?, options: ['鍔犵撼銆侀┈閲屻€佹娴?, '鍩冨強銆佸反姣斾鸡', '缃楅┈銆佸笇鑵?, '娉㈡柉銆侀樋鎷変集'], answerIndex: 0, explanation: '绠€鍗曪細瑗块潪涓夊ぇ鍙ゅ浗銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍗楅儴闈炴床钁楀悕鐨勭煶澶村煄閬楀潃鏄?, options: ['澶ф触宸村竷闊?, '閲戝瓧濉?, '绌轰腑鑺卞洯', '甯曠壒鍐滅搴?], answerIndex: 0, explanation: '绠€鍗曪細澶ф触宸村竷闊︺€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍒涢€犵帥闆呮枃鏄庣殑鏄?, options: ['鍗扮瀹変汉', '鍥犵航鐗逛汉', '姣涘埄浜?, '缁翠含浜?], answerIndex: 0, explanation: '绠€鍗曪細缇庢床鍗扮瀹変汉銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鐜涢泤浜哄湪澶╂枃瀛︿笂鐨勭獊鍑烘垚灏辨槸', options: ['鍒跺畾浜嗙簿纭殑澶槼鍘?, '鍙戞槑鍦板姩浠?, '鎻愬嚭鏃ュ績璇?, '鍙戠幇鏂板ぇ闄?], answerIndex: 0, explanation: '涓瓑锛氱帥闆呭巻娉曘€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '13鈥?6涓栫邯宕涜捣浜庝腑缇庢床鐨勬枃鏄庢槸', options: ['闃垮吂鐗瑰厠', '鍗板姞', '鐜涢泤', '鐖辨柉鍩烘懇'], answerIndex: 0, explanation: '涓瓑锛氱壒璇哄钂傜壒鍏般€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍗楃編娲插畨绗柉楂樺師鐨勬枃鏄庢槸', options: ['鍗板姞', '闃垮吂鐗瑰厠', '鐜涢泤', '鑻忕編灏?], answerIndex: 0, explanation: '涓瓑锛氬嵃鍔犲笣鍥姐€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼粬浠病鏈夌墰椹紝鍗村缓閫犱簡澶槼绁炲簷锛涙病鏈夐搧鍣紝鍗村垱閫犱簡绮剧編闄跺櫒銆傘€嶈鏉愭枡鎻忚堪鐨勬槸', options: ['娆ф床涓笘绾枃鏄?, '缇庢床鍗扮瀹夋枃鏄?, '涓滀簹鍐滆€曟枃鏄?, '闈炴床娓哥墽鏂囨槑'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀嫭绔嬪彂灞曠殑缇庢床鏂囨槑銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缇庢床涓夊ぇ鏂囨槑鏄?, options: ['鐜涢泤銆侀樋鍏圭壒鍏嬨€佸嵃鍔?, '甯岃厞銆佺綏椹€佽喀澶熀', '鍩冨強銆佸反姣斾鸡銆佸嵃搴?, '涓浗銆佹棩鏈€佹湞椴?], answerIndex: 0, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽嵃绗畨浜哄垱閫犮€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級澶ф触宸村竷闊﹂仐鍧€璇存槑', options: ['闈炴床鏂囨槑钀藉悗', '鍗楅儴闈炴床鏇惧瓨鍦ㄥ彂杈剧殑鍙や唬鏂囨槑', '闈炴床娌℃湁鍩庡競', '闈炴床瀹屽叏鍘熷'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄潪娲叉枃鏄庢垚灏便€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝缇庢床鍗扮瀹夋枃鏄庝笌娆т簹鏂囨槑锛屼簩鑰呮渶澶т笉鍚屾槸', options: ['閮戒娇鐢ㄩ搧鍣?, '缇庢床鏂囨槑鐙珛鍙戝睍銆佷笌娆т簹澶ч檰鐩稿闅旂粷', '閮藉彂鏄庢枃瀛?, '閮藉缓绔嬪笣鍥?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽绔嬪彂灞曘€? },
    ],
  },

  {
    id: 'g-his-9a-13', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簲鍗曞厓 璧板悜杩戜唬', edition: '缁熺紪鐗?, section: '绗?3璇?瑗挎缁忔祹鍜岀ぞ浼氬彂灞曚笌鏂囪壓澶嶅叴杩愬姩',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?3璇? },
    knowledgePoints: [
      { id: 'kp1', title: '璧勬湰涓讳箟钀岃娊', content: '绉熷湴鍐滃満銆佹墜宸ュ伐鍦猴紝鍑虹幇闆囦剑鍏崇郴銆? },
      { id: 'kp2', title: '鏂囪壓澶嶅叴', content: '14涓栫邯鎰忓ぇ鍒╋紝浜烘枃涓讳箟锛屼絾涓併€佽揪路鑺銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '瑗挎璧勬湰涓讳箟钀岃娊浜х敓鐨勬爣蹇楁槸', options: ['搴勫洯鍑虹幇', '绉熷湴鍐滃満鍜屾墜宸ュ伐鍦哄嚭鐜般€侀泧浣ｅ叧绯?, '琛屼細鍑虹幇', '鍩庡競鍏磋捣'], answerIndex: 1, explanation: '绠€鍗曪細闆囦剑鍏崇郴鏄祫鏈富涔夌壒寰併€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鏂囪壓澶嶅叴杩愬姩棣栧厛鍏磋捣浜?, options: ['鑻卞浗', '鎰忓ぇ鍒?, '娉曞浗', '瑗跨彮鐗?], answerIndex: 1, explanation: '绠€鍗曪細14涓栫邯鎰忓ぇ鍒┿€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏂囪壓澶嶅叴鐨勬牳蹇冩€濇兂鏄?, options: ['浜烘枃涓讳箟', '鐞嗘€т富涔?, '鑷敱涓讳箟', '绁炴潈涓讳箟'], answerIndex: 0, explanation: '绠€鍗曪細浠ヤ汉涓轰腑蹇冦€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏂囪壓澶嶅叴鐨勫厛椹辨槸', options: ['浣嗕竵', '杈韭疯姮濂?, '鑾庡＋姣斾簹', '褰肩壒鎷夊厠'], answerIndex: 0, explanation: '涓瓑锛氥€婄鏇层€嬨€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '銆婅挋濞滀附鑾庛€嬬殑浣滆€呮槸', options: ['浣嗕竵', '杈韭疯姮濂?, '鎷夋枑灏?, '绫冲紑鏈楃惇缃?], answerIndex: 1, explanation: '涓瓑锛氱編鏈笁鏉颁箣涓€銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鑻卞浗鏂囧宸ㄥ尃鑾庡＋姣斾簹鐨勪唬琛ㄤ綔鏄?, options: ['銆婄鏇层€?, '銆婂搱濮嗛浄鐗广€嬨€婄綏瀵嗘涓庢湵涓藉彾銆?, '銆婃渶鍚庣殑鏅氶銆?, '銆婂崄鏃ヨ皥銆?], answerIndex: 1, explanation: '涓瓑锛氭垙鍓т唬琛ㄤ綔銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼汉鏄竴浠跺涔堜簡涓嶈捣鐨勬澃浣滐紒澶氫箞楂樿吹鐨勭悊鎬э紒澶氫箞浼熷ぇ鐨勫姏閲忥紒銆嶈鍙拌瘝鍑鸿嚜', options: ['銆婄鏇层€?, '銆婂搱濮嗛浄鐗广€?, '銆婅挋濞滀附鑾庛€?, '銆婂湥缁忋€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄鎵汉鎬с€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏂囪壓澶嶅叴鐨勫疄璐ㄦ槸', options: ['鍙ゅ笇鑵婄綏椹枃鍖栧鍏?, '璧勪骇闃剁骇鏂版枃鍖栬繍鍔ㄣ€佹€濇兂瑙ｆ斁', '瀹楁暀鏀归潻', '灏佸缓鏂囧寲鍙戝睍'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃祫浜ч樁绾у弽灏佸缓銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浜烘枃涓讳箟鐨勮繘姝ユ剰涔夊湪浜?, options: ['浠ョ涓轰腑蹇?, '鎻愬€′互浜轰负涓績銆佽拷姹傜幇涓栧垢绂忋€佷績杩涙€濇兂瑙ｆ斁', '缁存姢鏁欎細鏉冨▉', '绂佹鑻﹁'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾€濇兂瑙夐啋銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓笘绾簞鍥笌绉熷湴鍐滃満锛屽悗鑰呮柊鍦ㄤ簬', options: ['鑷粰鑷冻', '鍑虹幇闆囦剑鍔冲姩銆侀潰鍚戝競鍦虹殑璧勬湰涓讳箟鐢熶骇', '鍐滃ゴ鍔冲姩', '鑷劧缁忔祹'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粡娴庤浆鍨嬨€? },
    ],
  },

  {
    id: 'g-his-9a-14', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簲鍗曞厓 璧板悜杩戜唬', edition: '缁熺紪鐗?, section: '绗?4璇?鎺㈠鏂拌埅璺?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?4璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鏂拌埅璺紑杈熷師鍥?, content: '鍟嗗搧缁忔祹鍙戝睍銆佸閲戠儹銆佸ゥ鏂浖鎺у埗鍟嗚矾銆? },
      { id: 'kp2', title: '涓昏鑸捣瀹?, content: '杩簹澹€佽揪路浼介┈銆佸摜浼﹀竷銆侀害鍝蹭鸡銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '15涓栫邯鏈紝娆ф床浜烘帰瀵绘柊鑸矾鐨勬牴鏈師鍥犳槸', options: ['浼犳挱鍩虹潱鏁?, '娆ф床鍟嗗搧缁忔祹鏃ヨ秼鍙戣揪銆佹复鏈涢粍閲?, '濂ユ柉鏇煎笣鍥芥帶鍒朵笢瑗挎柟鍟嗚矾', '閫犺埞鎶€鏈繘姝?], answerIndex: 1, explanation: '绠€鍗曪細鍟嗗搧缁忔祹鍙戝睍鏄牴婧愩€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鍙戠幇缇庢床鏂板ぇ闄嗙殑鑸捣瀹舵槸', options: ['杩簹澹?, '杈韭蜂冀椹?, '鍝ヤ鸡甯?, '楹﹀摬浼?], answerIndex: 2, explanation: '绠€鍗曪細1492骞村摜浼﹀竷銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '瀹屾垚浜虹被棣栨鐜悆鑸鐨勬槸', options: ['鍝ヤ鸡甯冭埞闃?, '楹﹀摬浼﹁埞闃?, '杈韭蜂冀椹埞闃?, '杩簹澹埞闃?], answerIndex: 1, explanation: '绠€鍗曪細1519鈥?522骞淬€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍒拌揪鍗板害銆佸紑杈熼€氬線涓滄柟鏂拌埅璺殑鏄?, options: ['杩簹澹?, '杈韭蜂冀椹?, '鍝ヤ鸡甯?, '楹﹀摬浼?], answerIndex: 1, explanation: '涓瓑锛?498骞村埌杈惧嵃搴︺€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍒拌揪闈炴床濂芥湜瑙掔殑鑸捣瀹舵槸', options: ['杩簹澹?, '杈韭蜂冀椹?, '鍝ヤ鸡甯?, '楹﹀摬浼?], answerIndex: 0, explanation: '涓瓑锛氳开浜氬＋銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '娆ф床浜哄紑杈熸柊鑸矾鐨勫瑙傛潯浠朵笉鍖呮嫭', options: ['鍦板渾瀛﹁娴佽', '鎸囧崡閽堝簲鐢ㄤ簬鑸捣', '閫犺埞鎶€鏈繘姝?, '瀹屾垚宸ヤ笟闈╁懡'], answerIndex: 3, explanation: '涓瓑锛氬伐涓氶潻鍛藉湪18涓栫邯銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?492骞?0鏈堬紝鎴戝彂鐜颁簡澶ч檰锛屽苟涓婂哺锛岃鍒颁簡褰撳湴灞呮皯鈥︹€︺€嶈鑸捣瀹舵槸', options: ['杩簹澹?, '鍝ヤ鸡甯?, '楹﹀摬浼?, '杈韭蜂冀椹?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽彂鐜扮編娲层€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏂拌埅璺紑杈熺殑涓栫晫鎰忎箟鏄?, options: ['娆ф床鎴愪负宸ヤ笟鍥?, '涓栫晫寮€濮嬭繛涓轰竴涓暣浣撱€佷笘鐣岀殑瑙傚康浠庢閫愭纭珛', '娈栨皯鎺犲ず缁撴潫', '缇庢床杩涘叆灏佸缓鏃朵唬'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽叏鐞冨寲寮€绔€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝閮戝拰涓嬭タ娲嬩笌鍝ヤ鸡甯冭繙鑸紝浜岃€呭叡鍚岀偣鏄?, options: ['閮戒负浜嗘畺姘戞墿寮?, '閮芥槸鑸捣澹妇銆侀兘鍔犲己浜嗗悇鍦拌仈绯?, '閮藉彂鐢熷湪15涓栫邯鏈?, '閮藉甫鏉ヤ簡娈栨皯鐏鹃毦'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃埅娴峰彶銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏂拌埅璺紑杈熷娆ф床鐨勫奖鍝嶆槸', options: ['灏佸缓鍔垮姏澧炲己', '淇冭繘璧勬湰涓讳箟浜х敓鍜屽彂灞曘€佸紩鍙戜环鏍奸潻鍛?, '璧板悜闂叧閿佸浗', '涓уけ娴蜂笂闇告潈'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽晢涓氶潻鍛姐€? },
    ],
  },

  {
    id: 'g-his-9a-15', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗簲鍗曞厓 璧板悜杩戜唬', edition: '缁熺紪鐗?, section: '绗?5璇?鏃╂湡娈栨皯鎺犲ず',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?5璇? },
    knowledgePoints: [
      { id: 'kp1', title: '瑗胯憽娈栨皯', content: '鏈€鏃╂畺姘戯紝瑗跨彮鐗欐棤鏁岃埌闃熴€? },
      { id: 'kp2', title: '涓夎璐告槗涓庤嫳鍥芥畺姘?, content: '榛戝ゴ璐告槗锛?8涓栫邯鑻卞浗鏃ヤ笉钀藉笣鍥姐€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鏈€鏃╄繘琛屾畺姘戠殑鍥藉鏄?, options: ['鑻卞浗鍜屾硶鍥?, '瑗跨彮鐗欏拰钁¤悇鐗?, '鑽峰叞鍜屾瘮鍒╂椂', '鎰忓ぇ鍒╁拰寰锋剰蹇?], answerIndex: 1, explanation: '绠€鍗曪細鏂拌埅璺紑杈熷悗瑗胯憽鏈€鏃┿€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '18涓栫邯鍚庡崐鏈燂紝鎴愪负涓栫晫涓婃渶寮哄ぇ鐨勬畺姘戝浗瀹躲€佸彿绉版棩涓嶈惤甯濆浗鐨勬槸', options: ['瑗跨彮鐗?, '鑻卞浗', '娉曞浗', '鑽峰叞'], answerIndex: 1, explanation: '绠€鍗曪細鑻卞浗鍏堝悗鎴樿儨瑗胯嵎娉曘€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '缃伓鐨勪笁瑙掕锤鏄撶殑涓▼杩愯緭鐨勬槸', options: ['鐏櫒鍜屽伐涓氬搧', '榛戜汉濂撮毝', '钄楃硸鍜岀儫鑽?, '榛勯噾鍜岀櫧閾?], answerIndex: 1, explanation: '绠€鍗曪細闈炴床鍒扮編娲茶繍榛戝ゴ銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '涓夎璐告槗鐨勮埅绋嬮『搴忔槸', options: ['娆ф床鈥旈潪娲测€旂編娲测€旀娲?, '娆ф床鈥旂編娲测€旈潪娲测€旀娲?, '闈炴床鈥旀娲测€旂編娲测€旈潪娲?, '缇庢床鈥旀娲测€旈潪娲测€旂編娲?], answerIndex: 0, explanation: '涓瓑锛氬嚭绋嬨€佷腑绋嬨€佸綊绋嬨€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '1588骞磋嫳鍥芥墦璐ュ摢涓浗瀹剁殑鏃犳晫鑸伴槦锛岄€愭笎鎴愪负娴蜂笂闇镐富', options: ['钁¤悇鐗?, '瑗跨彮鐗?, '鑽峰叞', '娉曞浗'], answerIndex: 1, explanation: '涓瓑锛?588骞磋嫳瑗挎捣鎴樸€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓夎璐告槗涓紝鏈€鍏锋偛鎯ㄦ€у拰琛€鑵ユ€х殑鏄?, options: ['鍑虹▼锛堟娲插埌闈炴床锛?, '涓▼锛堥粦濂存í娓″ぇ瑗挎磱锛?, '褰掔▼锛堢編娲插埌娆ф床锛?, '鍏ㄧ▼閮戒笉鎮叉儴'], answerIndex: 1, explanation: '涓瓑锛氶粦濂存浜＄巼鏋侀珮銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岄潪娲插彉鎴愬晢涓氭€х寧鑾烽粦浜虹殑鍦烘墍銆傘€嶈鏉愭枡鎻忚堪鐨勬槸', options: ['鏂拌埅璺紑杈?, '缃伓鐨勪笁瑙掕锤鏄?, '鏂囪壓澶嶅叴', '宸ヤ笟闈╁懡'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄粦濂磋锤鏄撱€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏃╂湡娈栨皯鎺犲ず瀵规娲茬殑褰卞搷鏄?, options: ['鍓婂急浜嗘娲?, '鏈夊姪浜庢娲叉畺姘戝浗瀹剁殑璧勬湰鍘熷绉疮', '闃荤浜嗚祫鏈富涔夊彂灞?, '浣挎娲茶蛋鍚戝皝闂?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃祫鏈師濮嬬Н绱€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓夎璐告槗瀵归潪娲茬殑鍗卞鏄?, options: ['淇冭繘浜嗛潪娲插彂灞?, '浣块潪娲蹭抚澶卞ぇ閲忕簿澹姵鍔ㄥ姏銆侀€犳垚闀挎湡钀藉悗', '甯︽潵浜嗗厛杩涙妧鏈?, '瀹炵幇浜嗛潪娲插伐涓氬寲'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀伨闅炬繁閲嶃€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝瑗跨彮鐗欎笌鑻卞浗娈栨皯锛?8涓栫邯鍚庢湡鑻卞浗鑳滃嚭鐨勫叧閿槸', options: ['浜哄彛鏇村', '璧勬湰涓讳箟宸ュ晢涓氬彂杈俱€佹捣鍐涘己澶?, '鍥藉湡闈㈢Н鏇村ぇ', '灏佸缓鍒跺害鏇村厛杩?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽埗搴︿笌瀹炲姏銆? },
    ],
  },

  {
    id: 'g-his-9a-16', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗叚鍗曞厓 璧勬湰涓讳箟鍒跺害鐨勫垵姝ョ‘绔?, edition: '缁熺紪鐗?, section: '绗?6璇?鑻卞浗璧勪骇闃剁骇闈╁懡',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?6璇? },
    knowledgePoints: [
      { id: 'kp1', title: '闈╁懡杩囩▼', content: '1640骞村紑濮嬶紝1688骞村厜鑽ｉ潻鍛姐€? },
      { id: 'kp2', title: '銆婃潈鍒╂硶妗堛€?, content: '1689骞撮甯冿紝鍚涗富绔嬪鍒剁‘绔嬨€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鑻卞浗璧勪骇闃剁骇闈╁懡寮€濮嬬殑鏍囧織鏄?, options: ['鑻忔牸鍏颁汉姘戣捣涔?, '1640骞磋浼氶噸鏂板彫寮€', '鏌ョ悊涓€涓栬澶勬', '鍏夎崳闈╁懡'], answerIndex: 1, explanation: '绠€鍗曪細1640骞磋浼氭枟浜夈€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鑻卞浗璧勪骇闃剁骇闈╁懡涓鎺ㄤ笂鏂ご鍙扮殑鍥界帇鏄?, options: ['瑭瑰澹竴涓?, '鏌ョ悊涓€涓?, '鏌ョ悊浜屼笘', '瑭瑰澹簩涓?], answerIndex: 1, explanation: '绠€鍗曪細1649骞存煡鐞嗕竴涓栥€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '1689骞磋嫳鍥借浼氶甯冪殑閲嶈娉曞緥鏄?, options: ['銆婂ぇ瀹珷銆?, '銆婃潈鍒╂硶妗堛€?, '銆婁汉鏉冨瑷€銆?, '銆婄嫭绔嬪瑷€銆?], answerIndex: 1, explanation: '绠€鍗曪細闄愬埗鐜嬫潈銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婃潈鍒╂硶妗堛€嬬‘绔嬬殑鏀挎不浣撳埗鏄?, options: ['鍚涗富涓撳埗', '鍚涗富绔嬪鍒?, '姘戜富鍏卞拰鍒?, '鑱旈偊鍒?], answerIndex: 1, explanation: '涓瓑锛氳浼氫富鏉冦€佸浗鐜嬬粺鑰屼笉娌汇€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '1688骞达紝鑻卞浗璧勪骇闃剁骇闈╁懡缁撴潫鐨勬爣蹇楁槸', options: ['鏌ョ悊涓€涓栬澶勬', '鍏夎崳闈╁懡', '銆婃潈鍒╂硶妗堛€嬮甯?, '鍐呮垬鐖嗗彂'], answerIndex: 1, explanation: '涓瓑锛氫笉娴佽鐨勬斂鍙樸€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '銆婃潈鍒╂硶妗堛€嬬殑鏍稿績鎬濇兂鏄?, options: ['鍔犲己鐜嬫潈', '闄愬埗鐜嬫潈銆佷繚璇佽浼氭潈鍔?, '鍙栨秷璁細', '搴熼櫎鍚涗富鍒?], answerIndex: 1, explanation: '涓瓑锛氱帇鍦ㄦ硶涓嬨€佺帇鍦ㄨ浼氥€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾湭缁忚浼氬悓鎰忥紝鍥界帇鏃犳潈搴熼櫎娉曞緥鎴栧仠姝㈡硶寰嬬殑鎵ц鈥︹€︺€嶈鏉℃枃鍑鸿嚜', options: ['銆婃潈鍒╂硶妗堛€?, '銆婄嫭绔嬪瑷€銆?, '銆婁汉鏉冨瑷€銆?, '銆婃嬁鐮翠粦娉曞吀銆?], answerIndex: 0, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄檺鍒剁帇鏉冦€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鑻卞浗璧勪骇闃剁骇闈╁懡鐨勫巻鍙叉剰涔夋槸', options: ['瀹炵幇浜嗗浗瀹剁粺涓€', '鎺ㄧ炕浜嗗皝寤哄悰涓讳笓鍒躲€佷负璧勬湰涓讳箟鍙戝睍寮€杈熼亾璺?, '搴熼櫎浜嗗悰涓诲埗', '纭珛浜嗘皯涓诲叡鍜屽埗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笘鐣岃繎浠ｅ彶寮€绔箣涓€銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鑻卞浗鍚涗富绔嬪鍒朵笌涓浗鍚涗富涓撳埗锛屽墠鑰呯壒鐐规槸', options: ['鍚涗富鎺屾彙瀹炴潈', '鍚涗富鏉冨姏鍙楁硶寰嬩弗鏍奸檺鍒躲€佽浼氫富鏉?, '鍚涗富涓栬缁堣韩鍒?, '娌℃湁鎴愭枃娉曞緥'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾硶娌诲彇浠ｄ汉娌汇€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鑻卞浗璧勪骇闃剁骇闈╁懡杩囩▼鏇叉姌鍙嶅锛岃鏄?, options: ['闈╁懡瀹屽叏涓嶅繀瑕?, '鏂板埗搴﹀彇浠ｆ棫鍒跺害鏄暱鏈熸洸鎶樼殑杩囩▼', '灏佸缓鍒跺害鏇翠紭瓒?, '闈╁懡涓嶄細鎴愬姛'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽巻鍙插彂灞曡寰嬨€? },
    ],
  },

  {
    id: 'g-his-9a-17', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗叚鍗曞厓 璧勬湰涓讳箟鍒跺害鐨勫垵姝ョ‘绔?, edition: '缁熺紪鐗?, section: '绗?7璇?缇庡浗鐨勭嫭绔?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?7璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鐙珛鎴樹簤', content: '1775骞存潵鍏嬫槦椤挎灙澹帮紝1776骞淬€婄嫭绔嬪瑷€銆嬶紝1783骞磋儨鍒┿€? },
      { id: 'kp2', title: '1787骞村娉?, content: '涓夋潈鍒嗙珛锛岃仈閭﹀埗鍏卞拰鍥姐€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '缇庡浗鐙珛鎴樹簤寮€濮嬬殑鏍囧織鏄?, options: ['娉㈠＋椤垮€捐尪浜嬩欢', '鏉ュ厠鏄熼】鐨勬灙澹?, '銆婄嫭绔嬪瑷€銆嬪彂琛?, '钀ㄦ媺鎵樺姞澶ф嵎'], answerIndex: 1, explanation: '绠€鍗曪細1775骞存潵鍏嬫槦椤裤€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '瀹ｅ憡鍖楃編13涓畺姘戝湴鑴辩鑻卞浗鐙珛鐨勬枃浠舵槸', options: ['銆婃潈鍒╂硶妗堛€?, '銆婄嫭绔嬪瑷€銆?, '銆婁汉鏉冨瑷€銆?, '銆婃嬁鐮翠粦娉曞吀銆?], answerIndex: 1, explanation: '绠€鍗曪細1776骞?鏈?鏃ャ€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '琚换鍛戒负澶ч檰鍐涙€诲徃浠ょ殑鏄?, options: ['鏉版枑閫?, '鍗庣洓椤?, '鏋楄偗', '瀵屽叞鍏嬫灄'], answerIndex: 1, explanation: '绠€鍗曪細鍗庣洓椤裤€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '缇庡浗鐙珛鎴樹簤鐨勮浆鎶樼偣鏄?, options: ['鏉ュ厠鏄熼】鏋０', '钀ㄦ媺鎵樺姞澶ф嵎', '绾﹀厠闀囨垬褰?, '娉㈠＋椤垮€捐尪浜嬩欢'], answerIndex: 1, explanation: '涓瓑锛?777骞磋惃鎷夋墭鍔犮€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '缇庡浗1787骞村娉曠‘绔嬬殑鍥藉缁撴瀯褰㈠紡鏄?, options: ['鍚涗富绔嬪鍒?, '鑱旈偊鍒跺叡鍜屽浗', '閭﹁仈鍒?, '鍗曚竴鍒?], answerIndex: 1, explanation: '涓瓑锛氳仈閭﹀埗銆佷笁鏉冨垎绔嬨€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '1787骞村娉曞湪鏉冨姏缁撴瀯涓獊鍑轰綋鐜扮殑鍘熷垯鏄?, options: ['鐜嬫潈鑷充笂', '涓夋潈鍒嗙珛銆佺浉浜掑埗琛?, '璁細闆嗘潈', '鍚涗富涓撳埗'], answerIndex: 1, explanation: '涓瓑锛氳鏀裤€佺珛娉曘€佸徃娉曠浉浜掔嫭绔嬨€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屾垜浠互杩欎簺娈栨皯鍦扮殑鍠勮壇浜烘皯鐨勫悕涔夊拰鏉冨姏锛岃皑搴勪弗瀹ｅ憡锛氳繖浜涜仈鍚堟畺姘戝湴浠庢鎴愪负銆佽€屼笖鍚嶆瑷€椤哄湴搴斿綋鎴愪负鑷敱鐙珛鐨勫悎浼楀浗銆傘€嶈鏂囩尞鏄?, options: ['銆婃潈鍒╂硶妗堛€?, '銆婄嫭绔嬪瑷€銆?, '銆婁汉鏉冨瑷€銆?, '銆婃硶鍏搞€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀嫭绔嬪瑷€銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級缇庡浗鐙珛鎴樹簤鐨勬€ц川鏄?, options: ['璧勪骇闃剁骇鏀归潻', '鏃㈡槸姘戞棌瑙ｆ斁鎴樹簤锛屽張鏄祫浜ч樁绾ч潻鍛?, '瀵瑰渚电暐鎴樹簤', '鍐滃ゴ鍒舵敼闈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽弻閲嶆€ц川銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鑻卞浗銆婃潈鍒╂硶妗堛€嬩笌缇庡浗1787骞村娉曪紝鍏卞悓鐐规槸', options: ['閮界‘绔嬪悰涓荤珛瀹埗', '閮戒綋鐜拌祫浜ч樁绾ф皯涓诲師鍒欍€侀檺鍒舵潈鍔?, '閮藉簾闄や簡濂撮毝鍒?, '閮藉疄琛屼笁鏉冨垎绔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繎浠ｅ鏀裤€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍗庣洓椤垮湪缇庡浗鍘嗗彶涓婄殑涓昏璐＄尞鏄?, options: ['搴熼櫎榛戝ゴ鍒?, '棰嗗鐙珛鎴樹簤銆佷富鎸佸埗瀹€佸紑鍒涙皯涓绘斂娌诲厛娌?, '璐拱璺槗鏂畨閭?, '鎺ㄨ缃楁柉绂忔柊鏀?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽浗鐖跺湴浣嶃€? },
    ],
  },

  {
    id: 'g-his-9a-18', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗叚鍗曞厓 璧勬湰涓讳箟鍒跺害鐨勫垵姝ョ‘绔?, edition: '缁熺紪鐗?, section: '绗?8璇?娉曞浗澶ч潻鍛藉拰鎷跨牬浠戝笣鍥?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?8璇? },
    knowledgePoints: [
      { id: 'kp1', title: '娉曞浗澶ч潻鍛?, content: '1789骞存敾鍗犲反澹簳鐙憋紝銆婁汉鏉冨瑷€銆嬨€? },
      { id: 'kp2', title: '鎷跨牬浠戝笣鍥?, content: '1804骞村缓绔嬶紝銆婃嬁鐮翠粦娉曞吀銆嬶紝1815骞村け璐ャ€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '娉曞浗澶ч潻鍛界垎鍙戠殑鏍囧織鏄?, options: ['涓夌骇浼氳鍙紑', '鏀诲崰宸村＋搴曠嫳', '銆婁汉鏉冨瑷€銆嬪彂琛?, '澶勬璺槗鍗佸叚'], answerIndex: 1, explanation: '绠€鍗曪細1789骞?鏈?4鏃ャ€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '娉曞浗澶ч潻鍛界殑绾查鎬ф枃浠舵槸', options: ['銆婃潈鍒╂硶妗堛€?, '銆婄嫭绔嬪瑷€銆?, '銆婁汉鏉冨瑷€銆?, '銆婃嬁鐮翠粦娉曞吀銆?], answerIndex: 2, explanation: '绠€鍗曪細瀹ｅ憡浜烘潈銆佹硶娌汇€佽嚜鐢卞钩绛夈€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鎷跨牬浠戝缓绔嬫硶鍏拌タ绗竴甯濆浗鏄湪', options: ['1789骞?, '1799骞?, '1804骞?, '1815骞?], answerIndex: 2, explanation: '绠€鍗曪細1804骞村姞鍐曘€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鎷跨牬浠戦甯冪殑钁楀悕娉曞吀鏄?, options: ['銆婃眽璋熸媺姣旀硶鍏搞€?, '銆婃嬁鐮翠粦娉曞吀銆嬶紙銆婃硶鍥芥皯娉曞吀銆嬶級', '銆婃煡澹竵灏兼硶鍏搞€?, '銆婂崄浜岄摐琛ㄦ硶銆?], answerIndex: 1, explanation: '涓瓑锛氱‘绔嬭祫鏈富涔夌珛娉曡鑼冦€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '娉曞浗澶ч潻鍛戒腑锛岃鎺ㄤ笂鏂ご鍙扮殑鍥界帇鏄?, options: ['鏌ョ悊涓€涓?, '璺槗鍗佸叚', '瑭瑰澹簩涓?, '鑵撳姏浜屼笘'], answerIndex: 1, explanation: '涓瓑锛?793骞村姝汇€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '娉曞浗澶ч潻鍛界殑鎬濇兂鍩虹鏄?, options: ['鏂囪壓澶嶅叴', '鍚挋杩愬姩', '瀹楁暀鏀归潻', '鑷敱涓讳箟鎬濇疆'], answerIndex: 1, explanation: '涓瓑锛氫紡灏旀嘲銆佸瓱寰锋柉楦犮€佸崲姊€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屽湪鏉冨埄鏂归潰锛屼汉浠敓鏉ユ槸鑰屼笖濮嬬粓鏄嚜鐢卞钩绛夌殑鈥︹€︽硶寰嬫槸鍏叡鎰忓織鐨勮〃鐜般€傘€嶈鏉℃枃鍑鸿嚜', options: ['銆婃潈鍒╂硶妗堛€?, '銆婄嫭绔嬪瑷€銆?, '銆婁汉鏉冨瑷€銆?, '銆婃嬁鐮翠粦娉曞吀銆?], answerIndex: 2, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼汉鏉冨瑷€銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級娉曞浗澶ч潻鍛界殑鍘嗗彶鎰忎箟鏄?, options: ['瀹炵幇浜嗗浗瀹剁嫭绔?, '鎽ф瘉浜嗘硶鍥藉皝寤虹粺娌汇€佷紶鎾簡璧勪骇闃剁骇鑷敱姘戜富鎬濇兂', '搴熼櫎浜嗛粦濂村埗', '纭珛浜嗗悰涓荤珛瀹埗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾渶褰诲簳鐨勮祫浜ч樁绾ч潻鍛姐€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級璇勪环鎷跨牬浠戝澶栨垬浜夛紝姝ｇ‘鐨勬槸', options: ['瀹屽叏姝ｄ箟', '鏃㈡墦鍑讳簡娆ф床灏佸缓鍔垮姏锛屼篃鍏锋湁渚电暐鎬?, '绾睘渚电暐鎴樹簤', '姣棤杩涙鎰忎箟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼竴鍒嗕负浜屻€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鑻卞浗銆佺編鍥姐€佹硶鍥借祫浜ч樁绾ч潻鍛斤紝鍏卞悓鐐规槸', options: ['閮藉姝讳簡鍥界帇', '閮芥壂闄よ祫鏈富涔夊彂灞曢殰纰嶃€佺‘绔嬭祫浜ч樁绾х粺娌?, '閮芥姉鍑诲鏉ユ瑁呭共娑?, '閮藉彂鐢熷湪18涓栫邯'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾椂浠ｆ疆娴併€? },
    ],
  },

  {
    id: 'g-his-9a-19', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竷鍗曞厓 绗竴娆″伐涓氶潻鍛藉拰椹厠鎬濅富涔夌殑璇炵敓', edition: '缁熺紪鐗?, section: '绗?9璇?绗竴娆″伐涓氶潻鍛?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?9璇? },
    knowledgePoints: [
      { id: 'kp1', title: '宸ヤ笟闈╁懡鍏磋捣', content: '18涓栫邯60骞翠唬鑻卞浗锛屾绾虹粐涓氾紝鐝嶅Ξ鏈恒€? },
      { id: 'kp2', title: '钂告苯鏃朵唬', content: '鐡︾壒鏀硅壇钂告苯鏈猴紝鍙茶拏鑺瓩鍙戞槑鐏溅銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '宸ヤ笟闈╁懡棣栧厛寮€濮嬩簬', options: ['娉曞浗', '鑻卞浗', '缇庡浗', '寰峰浗'], answerIndex: 1, explanation: '绠€鍗曪細鑻卞浗妫夌汉缁囦笟銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '宸ヤ笟闈╁懡寮€濮嬬殑鏍囧織鏄?, options: ['椋炴鍙戞槑', '鍝堟牸閲屽か鏂彂鏄庣弽濡満', '鐡︾壒鏀硅壇钂告苯鏈?, '鐏溅鍙戞槑'], answerIndex: 1, explanation: '绠€鍗曪細1765骞寸弽濡満銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏀硅壇钂告苯鏈虹殑鍙戞槑瀹舵槸', options: ['鍝堟牸閲屽か鏂?, '鐡︾壒', '鍙茶拏鑺瓩', '瀵屽皵椤?], answerIndex: 1, explanation: '绠€鍗曪細鐡︾壒銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '钂告苯鏈虹殑骞挎硾搴旂敤浣夸汉绫昏繘鍏?, options: ['榛勯噾鏃朵唬', '钂告苯鏃朵唬', '鐢垫皵鏃朵唬', '淇℃伅鏃朵唬'], answerIndex: 1, explanation: '涓瓑锛氳捀姹芥椂浠ｃ€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍙戞槑钂告苯鏈鸿溅锛堢伀杞︼級鐨勬槸', options: ['鐡︾壒', '鍙茶拏鑺瓩', '瀵屽皵椤?, '鍗″皵路鏈尐'], answerIndex: 1, explanation: '涓瓑锛?814骞村彶钂傝姮瀛欍€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '宸ヤ笟闈╁懡涓紝宸ュ巶鍒跺害鍙栦唬浜?, options: ['鎵嬪伐浣滃潑鍜屾墜宸ュ伐鍦?, '鏈哄櫒澶у伐涓?, '浼犵粺鍐滀笟', '浼犵粺鍟嗕笟'], answerIndex: 0, explanation: '涓瓑锛氱幇浠ｅ伐鍘傚埗搴︾‘绔嬨€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?814骞达紝鍙茶拏鑺瓩璁捐鐨勮捀姹芥満杞﹁瘯杞︽垚鍔熲€︹€?825骞寸涓€鏉￠搧璺€氳溅銆傘€嶈鎴愭灉浣夸汉绫昏繘鍏?, options: ['椹溅鏃朵唬', '閾佽矾鏃朵唬', '姹借溅鏃朵唬', '鑸┖鏃朵唬'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄搧璺椂浠ｃ€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绗竴娆″伐涓氶潻鍛藉涓栫晫鐨勫奖鍝嶆槸', options: ['浜虹被杩涘叆鐢垫皵鏃朵唬', '鏋佸ぇ鎻愰珮鐢熶骇鍔涖€佽タ鏂瑰厛杩涗笢鏂硅惤鍚庢牸灞€褰㈡垚', '缇庡浗鎴愪负涓栫晫闇镐富', '璧勬湰涓讳箟鍒跺害鏅亶琛拌惤'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀敓浜у姏椋炶穬銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鑻卞浗棣栧厛鍙戠敓宸ヤ笟闈╁懡鐨勬斂娌诲墠鎻愭槸', options: ['娴峰甯傚満鎵╁ぇ', '璧勪骇闃剁骇缁熸不鍦ㄨ嫳鍥界‘绔?, '鍦堝湴杩愬姩鎻愪緵鑷敱鍔冲姩鍔?, '鐓ょ偔璧勬簮涓板瘜'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽埗搴︿繚闅溿€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝绗竴娆″伐涓氶潻鍛戒笌绗簩娆″伐涓氶潻鍛斤紝鍓嶈€呯壒鐐规槸', options: ['浠ョ數鍔涗负鏍稿績', '鍙戞槑澶氬嚭鑷伐鍖犮€佷互钂告苯鏈轰负鏍囧織', '绉戝涓庢妧鏈揣瀵嗙粨鍚?, '杩涘叆淇℃伅鏃朵唬'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼袱娆″伐涓氶潻鍛藉樊寮傘€? },
    ],
  },

  {
    id: 'g-his-9a-20', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竷鍗曞厓 绗竴娆″伐涓氶潻鍛藉拰椹厠鎬濅富涔夌殑璇炵敓', edition: '缁熺紪鐗?, section: '绗?0璇?椹厠鎬濅富涔夌殑璇炵敓',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '绌烘兂绀句細涓讳箟', content: '鍦ｈタ闂ㄣ€佸倕绔嬪彾銆佹鏂囥€? },
      { id: 'kp2', title: '銆婂叡浜у厷瀹ｈ█銆?, content: '1848骞撮┈鍏嬫€濄€佹仼鏍兼柉鍙戣〃锛岄┈鍏嬫€濅富涔夎癁鐢熴€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绌烘兂绀句細涓讳箟鐨勪唬琛ㄤ汉鐗╀笉鍖呮嫭', options: ['鍦ｈタ闂?, '鍌呯珛鍙?, '娆ф枃', '椹厠鎬?], answerIndex: 3, explanation: '绠€鍗曪細椹厠鎬濇槸绉戝绀句細涓讳箟鍒涚珛鑰呫€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '椹厠鎬濅富涔夎癁鐢熺殑鏍囧織鏄?, options: ['銆婅祫鏈銆嬪嚭鐗?, '銆婂叡浜у厷瀹ｈ█銆嬪彂琛?, '绗竴鍥介檯鎴愮珛', '宸撮粠鍏ぞ鎴愮珛'], answerIndex: 1, explanation: '绠€鍗曪細1848骞?鏈堛€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '銆婂叡浜у厷瀹ｈ█銆嬬殑浣滆€呮槸', options: ['椹厠鎬濆拰鎭╂牸鏂?, '鍒楀畞鍜屾柉澶ф灄', '鍦ｈタ闂ㄥ拰鍌呯珛鍙?, '姣涙辰涓?], answerIndex: 0, explanation: '绠€鍗曪細椹仼鍚堣憲銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婂叡浜у厷瀹ｈ█銆嬪彂琛ㄤ簬', options: ['1818骞?, '1848骞?, '1871骞?, '1917骞?], answerIndex: 1, explanation: '涓瓑锛?848骞淬€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '椹厠鎬濅富涔変富瑕佸寘鎷?, options: ['椹厠鎬濅富涔夊摬瀛︺€佹斂娌荤粡娴庡銆佺瀛︾ぞ浼氫富涔?, '绌烘兂绀句細涓讳箟', '鍚挋鎬濇兂', '涓夋皯涓讳箟'], answerIndex: 0, explanation: '涓瓑锛氫笁涓粍鎴愰儴鍒嗐€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '绌烘兂绀句細涓讳箟涔嬫墍浠ユ槸绌烘兂锛屼富瑕佸洜涓?, options: ['鍙嶅绉佹湁鍒?, '鏈兘鎻ず璧勬湰涓讳箟鏈川銆佸瘎鏈涗簬澶╂墠鍜屾敼鑹?, '涓诲紶闃剁骇鏂椾簤', '鏀寔宸ヤ汉杩愬姩'], answerIndex: 1, explanation: '涓瓑锛氭湭鎵惧埌瀹炵幇绀句細鐞嗘兂鐨勬纭亾璺€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岃缁熸不闃剁骇鍦ㄥ叡浜т富涔夐潻鍛介潰鍓嶅彂鎶栧惂銆傛棤浜ц€呭湪杩欎釜闈╁懡涓け鍘荤殑鍙槸閿侀摼銆備粬浠幏寰楃殑灏嗘槸鏁翠釜涓栫晫銆傘€嶈鍙峰彫鍑鸿嚜', options: ['銆婁汉鏉冨瑷€銆?, '銆婂叡浜у厷瀹ｈ█銆?, '銆婄嫭绔嬪瑷€銆?, '銆婃嬁鐮翠粦娉曞吀銆?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屻€婂叡浜у厷瀹ｈ█銆嬨€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婂叡浜у厷瀹ｈ█銆嬪彂琛ㄧ殑鍘嗗彶鎰忎箟鏄?, options: ['鍚﹀畾浜嗚祫鏈富涔?, '鏍囧織椹厠鎬濅富涔夎癁鐢熴€佸浗闄呭伐浜鸿繍鍔ㄨ繘鍏ユ柊鏃舵湡', '寤虹珛浜嗙涓€涓ぞ浼氫富涔夊浗瀹?, '缁撴潫浜嗗皝寤虹粺娌?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾€濇兂姝﹀櫒銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝绌烘兂绀句細涓讳箟涓庣瀛︾ぞ浼氫富涔夛紝鍚庤€呰繘姝ュ湪浜?, options: ['鎵瑰垽璧勬湰涓讳箟', '鎻ず浜嗙ぞ浼氬彂灞曡寰嬨€佹寚鏄庢棤浜ч樁绾ч潻鍛介亾璺?, '涓诲紶鏀硅壇', '瀵勬湜浜庡瘜浜烘柦鑸?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼粠绌烘兂鍒扮瀛︺€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級椹厠鎬濅富涔夎癁鐢熺殑鏍规湰缁忔祹鏍规簮鏄?, options: ['宸ヤ汉杩愬姩鍏磋捣', '宸ヤ笟闈╁懡鍚庤祫鏈富涔夊彂灞曘€佺煕鐩炬毚闇?, '娆ф床鎬濇兂瑙ｆ斁', '椹厠鎬濅釜浜哄ぉ鎵?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粡娴庡熀纭€鍐冲畾鎬濇兂銆? },
    ],
  },

  {
    id: 'g-his-9a-21', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竷鍗曞厓 绗竴娆″伐涓氶潻鍛藉拰椹厠鎬濅富涔夌殑璇炵敓', edition: '缁熺紪鐗?, section: '绗?1璇?绗竴鍥介檯鍜屽反榛庡叕绀?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '绗竴鍥介檯', content: '1864骞存垚绔嬶紝鍥介檯宸ヤ汉鍗忎細銆? },
      { id: 'kp2', title: '宸撮粠鍏ぞ', content: '1871骞达紝鏃犱骇闃剁骇寤虹珛鏀挎潈鐨勭涓€娆′紵澶у皾璇曘€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1864骞存垚绔嬬殑鍥介檯宸ヤ汉缁勭粐鍙茬О', options: ['鍏变骇涓讳箟鑰呭悓鐩?, '绗竴鍥介檯', '绗簩鍥介檯', '鍏变骇鍥介檯'], answerIndex: 1, explanation: '绠€鍗曪細鍥介檯宸ヤ汉鍗忎細銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '宸撮粠鍏ぞ鎴愮珛浜?, options: ['1848骞?, '1871骞?, '1917骞?, '1889骞?], answerIndex: 1, explanation: '绠€鍗曪細1871骞?鏈?8鏃ャ€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏃犱骇闃剁骇寤虹珛鏀挎潈鐨勭涓€娆′紵澶у皾璇曟槸', options: ['瀹珷杩愬姩', '宸撮粠鍏ぞ', '鍗佹湀闈╁懡', '閲屾槀宸ヤ汉璧蜂箟'], answerIndex: 1, explanation: '绠€鍗曪細宸撮粠鍏ぞ銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '宸撮粠鍏ぞ澶辫触鐨勬爣蹇楁€ф垬褰规槸', options: ['婊戦搧鍗㈡垬褰?, '浜旀湀娴佽鍛?, '鍑″皵鐧绘垬褰?, '钀ㄥ鐡︽垬褰?], answerIndex: 1, explanation: '涓瓑锛?871骞?鏈?1鈥?8鏃ャ€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '绗竴鍥介檯鐨勭伒榄備汉鐗╂槸', options: ['椹厠鎬?, '鍒楀畞', '鏂ぇ鏋?, '娆ф枃'], answerIndex: 0, explanation: '涓瓑锛氶┈鍏嬫€濇槸瀹為檯棰嗗鑰呫€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '宸撮粠鍏ぞ鎵€浠ｈ〃鐨勬棤浜ч樁绾т笓鏀挎€ц川琛ㄧ幇鍦?, options: ['缁存姢璧勪骇闃剁骇鍒╃泭', '娌℃敹閫冧骸璧勬湰瀹跺伐鍘傘€佸缓绔嬪伐浜烘斂鏉?, '瀹炶鍚涗富鍒?, '淇濈暀鏃у浗瀹舵満鍣?], answerIndex: 1, explanation: '涓瓑锛氭墦纰庢棫鍥藉鏈哄櫒銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽叕绀剧殑浼熷ぇ绀句細鎺柦灏辨槸瀹冩湰韬殑瀛樺湪鍜屽伐浣溿€傚畠鎵€閲囧彇鐨勫悇椤瑰叿浣撴帾鏂斤紝鍙兘鏄剧ず鍑鸿蛋鍚戝睘浜庝汉姘戙€佺敱浜烘皯鎺屾潈鐨勬斂搴滅殑瓒嬪娍銆傘€嶈璇勪环閽堝鐨勬槸', options: ['娉曞浗澶ч潻鍛?, '宸撮粠鍏ぞ', '鑻卞浗瀹珷杩愬姩', '鍗佹湀闈╁懡'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼汉姘戞斂鏉冦€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級宸撮粠鍏ぞ鐨勫巻鍙叉剰涔夋槸', options: ['寤虹珛浜嗙涓€涓ぞ浼氫富涔夊浗瀹?, '鏃犱骇闃剁骇寤虹珛鏀挎潈鐨勭涓€娆′紵澶у皾璇?, '瀹炵幇浜嗙ぞ浼氫富涔夊伐涓氬寲', '搴熼櫎浜嗗啘濂村埗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄鍒涚簿绁炪€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝宸撮粠鍏ぞ涓庡崄鏈堥潻鍛斤紝鍚庤€?, options: ['鍙槸涓€娆″皾璇?, '鍙栧緱鎴愬姛銆佸缓绔嬩簡绗竴涓ぞ浼氫富涔夊浗瀹?, '鍙戠敓鍦ㄦ硶鍥?, '娌℃湁鏀垮厷棰嗗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼粠灏濊瘯鍒版垚鍔熴€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級绗竴鍥介檯鎴愮珛鐨勪富瑕佷綔鐢ㄦ槸', options: ['缁撴潫浜嗗伐浜鸿繍鍔?, '鎶婂悇鍥藉伐浜鸿繍鍔ㄨ仈鍚堣捣鏉ャ€佹帹鍔ㄥ浗闄呭伐浜鸿繍鍔ㄥ彂灞?, '瀹炵幇浜嗗悇鍥界粺涓€', '搴熼櫎浜嗙鏈夊埗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽浗闄呰仈鍚堛€? },
    ],
  },

  {
    id: 'g-his-9a-22', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竷鍗曞厓 绗竴娆″伐涓氶潻鍛藉拰椹厠鎬濅富涔夌殑璇炵敓', edition: '缁熺紪鐗?, section: '绗?2璇?娲诲姩璇?鍞卞搷鍥介檯姝?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9a', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '銆婂浗闄呮瓕銆嬪垱浣?, content: '1871骞存浠伮烽矋鐙勫焹浣滆瘝锛岀毊鍩冨皵路鐙勭洊鐗硅氨鏇层€? },
      { id: 'kp2', title: '銆婂浗闄呮瓕銆嬫剰涔?, content: '鍏ㄤ笘鐣屾棤浜ч樁绾х殑姝岋紝榧撹垶鏂椾簤銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '銆婂浗闄呮瓕銆嬬殑璇嶄綔鑰呮槸', options: ['娆т粊路椴嶇媱鍩?, '鐙勭洊鐗?, '椹厠鎬?, '鍒楀畞'], answerIndex: 0, explanation: '绠€鍗曪細宸撮粠鍏ぞ绀惧憳椴嶇媱鍩冦€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓恒€婂浗闄呮瓕銆嬭氨鏇茬殑鏄?, options: ['椴嶇媱鍩?, '鐙勭洊鐗?, '鑱傝€?, '鍐兼槦娴?], answerIndex: 1, explanation: '绠€鍗曪細1888骞寸媱鐩栫壒璋辨洸銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '銆婂浗闄呮瓕銆嬭癁鐢熺殑鍘嗗彶鑳屾櫙鏄?, options: ['鑻卞浗瀹珷杩愬姩', '宸撮粠鍏ぞ澶辫触', '鍗佹湀闈╁懡鑳滃埄', '宸ヤ笟闈╁懡寮€濮?], answerIndex: 1, explanation: '绠€鍗曪細绾康宸撮粠鍏ぞ銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婂浗闄呮瓕銆嬫槸涓€棣?, options: ['璧勪骇闃剁骇鎴樻瓕', '鍏ㄤ笘鐣屾棤浜ч樁绾х殑闈╁懡鎴樻瓕', '鍐涢槦杩涜鏇?, '姘戞瓕'], answerIndex: 1, explanation: '涓瓑锛氬浗闄呭伐浜鸿繍鍔ㄦ瓕鏇层€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '銆婂浗闄呮瓕銆嬬殑鍒涗綔鏃堕棿鏄?, options: ['1848骞?, '1871骞?, '1917骞?, '1889骞?], answerIndex: 1, explanation: '涓瓑锛氬反榛庡叕绀惧け璐ュ悗銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鑻辩壒绾抽泟鑰愬皵灏变竴瀹氳瀹炵幇銆傝嫳鐗圭撼闆勮€愬皵鎸囩殑鏄?, options: ['鍥介檯鑱旂洘', '鍏变骇涓讳箟鐞嗘兂', '鑱斿悎鍥?, '绗竴鍥介檯'], answerIndex: 1, explanation: '涓瓑锛氬叡浜т富涔夈€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼粠鏉ュ氨娌℃湁浠€涔堟晳涓栦富锛屼篃涓嶉潬绁炰粰鐨囧笣銆傝鍒涢€犱汉绫荤殑骞哥锛屽叏闈犳垜浠嚜宸便€傘€嶈姝岃瘝琛ㄨ揪鐨勬€濇兂鏄?, options: ['宕囨嫓绁炵伒', '鏃犱骇闃剁骇渚濋潬鑷繁瑙ｆ斁鑷繁', '瀵勬湜浜庤嫳闆勪汉鐗?, '鐩镐俊鍛借繍瀹夋帓'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃嚜涓诲鏂椼€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婂浗闄呮瓕銆嬭兘澶熷湪鍏ㄤ笘鐣屽箍娉涗紶鍞憋紝涓昏鍥犱负瀹?, options: ['鏃嬪緥鐗瑰埆浼樼編', '鍙嶆槧浜嗘棤浜ч樁绾ч潻鍛界悊鎯炽€佸叿鏈夊己澶х簿绁為紦鑸炲姏', '鐢辨硶鍥戒汉鍒涗綔', '鏄竴棣栧彜鑰佹皯姝?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀簿绁炲姏閲忋€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級銆婂浗闄呮瓕銆嬩笌涓嬪垪鍝竴鍘嗗彶浜嬩欢鑱旂郴鏈€绱у瘑', options: ['鑻卞浗璧勪骇闃剁骇闈╁懡', '宸撮粠鍏ぞ', '鏂拌埅璺紑杈?, '鏂囪壓澶嶅叴'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀邯蹇靛叕绀剧ぞ鍛樸€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝銆婂浗闄呮瓕銆嬩笌涓浗鍥芥瓕銆婁箟鍕囧啗杩涜鏇层€嬶紝鍏卞悓鐐规槸', options: ['閮戒骇鐢熶簬涓€鎴樻湡闂?, '閮介紦鑸炰汉姘戜负姘戞棌鐙珛鍜屼汉姘戣В鏀捐€屽鏂?, '閮界敱娉曞浗浜哄垱浣?, '閮芥槸姘戦棿灏忚皟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾椂浠ｆ垬姝屻€? },
    ],
  },

  {
    id: 'g-his-9b-1', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 娈栨皯鍦颁汉姘戠殑鍙嶆姉涓庤祫鏈富涔夊埗搴︾殑鎵╁睍', edition: '缁熺紪鐗?, section: '绗?璇?娈栨皯鍦颁汉姘戠殑鍙嶆姉鏂椾簤',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鎷変竵缇庢床鐙珛杩愬姩', content: '鐜诲埄鐡﹀皵銆佸湥椹竵锛屽弽鎶楄タ钁℃畺姘戙€? },
      { id: 'kp2', title: '鍗板害姘戞棌澶ц捣涔?, content: '1857鈥?859骞达紝绔犺タ濂崇帇銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '棰嗗鎷変竵缇庢床鐙珛杩愬姩銆佽瑾変负瑙ｆ斁鑰呯殑鏄?, options: ['鐜诲埄鐡﹀皵', '鍦ｉ┈涓?, '绔犺タ濂崇帇', '鍏嬩鸡濞佸皵'], answerIndex: 0, explanation: '绠€鍗曪細鐜诲埄鐡﹀皵瑙ｆ斁鍗楃編銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '1857鈥?859骞村嵃搴︽皯鏃忓ぇ璧蜂箟涓澃鍑虹殑濂宠嫳闆勬槸', options: ['鍦ｅコ璐炲痉', '绔犺タ濂崇帇', '浼婁附鑾庣櫧濂崇帇', '缁村鍒╀簹濂崇帇'], answerIndex: 1, explanation: '绠€鍗曪細绔犺タ濂崇帇銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鎷変竵缇庢床涓昏琚摢涓や釜鍥藉娈栨皯', options: ['鑻卞浗鍜屾硶鍥?, '瑗跨彮鐗欏拰钁¤悇鐗?, '鑽峰叞鍜屾瘮鍒╂椂', '寰峰浗鍜屾剰澶у埄'], answerIndex: 1, explanation: '绠€鍗曪細瑗胯憽娈栨皯鎷夌編鐨勫ぇ閮ㄥ垎銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍗板害姘戞棌澶ц捣涔夊弽鎶楃殑娈栨皯鑰呮槸', options: ['娉曞浗', '鑻卞浗', '钁¤悇鐗?, '鑽峰叞'], answerIndex: 1, explanation: '涓瓑锛氳嫳鍥戒笢鍗板害鍏徃銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '涓庣幓鍒╃摝灏斿叡鍚岄瀵兼媺缇庣嫭绔嬭繍鍔ㄣ€佽灏婁负鍥界埗鐨勬槸', options: ['鍦ｉ┈涓?, '鍗庣洓椤?, '鎷跨牬浠?, '浼婅揪灏斿摜'], answerIndex: 0, explanation: '涓瓑锛氬湥椹竵瑙ｆ斁鍗楃編鍗楅儴銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍗板害姘戞棌澶ц捣涔夌殑瀵肩伀绾挎槸', options: ['娉㈠＋椤垮€捐尪浜嬩欢', '娑傛补瀛愬脊浜嬩欢', '鏉ュ厠鏄熼】鏋０', '鏀诲崰宸村＋搴曠嫳'], answerIndex: 1, explanation: '涓瓑锛氭秱娌瑰瓙寮逛簨浠躲€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽ス鐜囬鍐涙皯鍚岃嫳鍥藉啗闃熷睍寮€鑻卞媷鏂椾簤锛屾渶鍚庤韩涓暟寮癸紝鍊掍笅鏃跺勾浠?3宀併€傘€嶈浜虹墿鏄?, options: ['鍦ｅコ璐炲痉', '绔犺タ濂崇帇', '浼婁附鑾庣櫧', '鍑憻鐞?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀珷瑗垮コ鐜嬨€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鎷変竵缇庢床鐙珛杩愬姩鐨勭粨鏋滄槸', options: ['瀹屽叏琚畺姘?, '褰诲簳鎺ㄧ炕瑗跨彮鐗欍€佽憽钀勭墮娈栨皯缁熸不锛屽嚭鐜颁竴绯诲垪鏂板叴鍥藉', '瀹炵幇浜嗘媺缇庣粺涓€', '淇濇寔浜嗘畺姘戝湴鍦颁綅'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾皯鏃忕嫭绔嬨€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級1857鈥?859骞村嵃搴︽皯鏃忓ぇ璧蜂箟鐨勬剰涔夋槸', options: ['鐩存帴鎺ㄧ炕鑻卞浗娈栨皯', '娌夐噸鎵撳嚮鑻卞浗娈栨皯缁熸不銆佸弽鏄犲嵃搴︽皯鏃忔剰璇嗚閱?, '瀹炵幇浜嗗嵃搴︾嫭绔?, '搴熼櫎浜嗙濮撳埗搴?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾皯鏃忚閱掋€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鎷夌編鐙珛杩愬姩涓庡嵃搴︽皯鏃忓ぇ璧蜂箟锛屽叡鍚岀偣鏄?, options: ['閮藉彇寰椾簡鎴愬姛', '閮藉弽鎶楁畺姘戠粺娌汇€佷簤鍙栨皯鏃忕嫭绔?, '閮藉彂鐢熷湪浜氭床', '閮界敱璧勪骇闃剁骇棰嗗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾畺姘戝湴鍙嶆姉銆? },
    ],
  },

  {
    id: 'g-his-9b-2', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 娈栨皯鍦颁汉姘戠殑鍙嶆姉涓庤祫鏈富涔夊埗搴︾殑鎵╁睍', edition: '缁熺紪鐗?, section: '绗?璇?淇勫浗鐨勬敼闈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '褰煎緱涓€涓栨敼闈?, content: '18涓栫邯鍒濓紝瀵屽浗寮哄叺锛屽紑鍚繎浠ｅ寲銆? },
      { id: 'kp2', title: '1861骞村啘濂村埗鏀归潻', content: '浜氬巻灞卞ぇ浜屼笘锛屽簾闄ゅ啘濂村埗锛岃蛋涓婅祫鏈富涔夐亾璺€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '褰煎緱涓€涓栨敼闈╃殑鐩殑鏄?, options: ['搴熼櫎鍐滃ゴ鍒?, '瀵屽浗寮哄叺銆佹敼鍙樹縿鍥借惤鍚庨潰璨?, '瑙ｆ斁鍐滃ゴ', '瀵瑰渚电暐鎵╁紶'], answerIndex: 1, explanation: '绠€鍗曪細瀛︿範瑗挎柟銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '绛剧讲搴熼櫎鍐滃ゴ鍒舵硶浠ょ殑娌欑殗鏄?, options: ['褰煎緱涓€涓?, '浜氬巻灞卞ぇ浜屼笘', '灏煎彜鎷変簩涓?, '浼婂嚒鍥涗笘'], answerIndex: 1, explanation: '绠€鍗曪細1861骞淬€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '淇勫浗1861骞存敼闈╁張琚О涓?, options: ['褰煎緱鏀归潻', '鍐滃ゴ鍒舵敼闈╋紙浜氬巻灞卞ぇ浜屼笘鏀归潻锛?, '鍗佹湀闈╁懡', '澶у寲鏀规柊'], answerIndex: 1, explanation: '绠€鍗曪細鑷笂鑰屼笅鐨勮祫浜ч樁绾ф€ц川鏀归潻銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '褰煎緱涓€涓栬縼閮藉埌', options: ['鑾柉绉?, '鍦ｅ郊寰楀牎', '鍩鸿緟', '鍠€灞?], answerIndex: 1, explanation: '涓瓑锛氶潰鍚戞娲茬殑绐楀彛銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1861骞存敼闈╁悗锛屽啘濂磋幏寰椾汉韬嚜鐢憋紝浣嗗繀椤?, options: ['鏃犲伩鍒嗗埌鍦熷湴', '鍑洪挶璧庝拱浠藉湴', '缁х画鏃犳潯浠舵湇鍔冲焦', '绔嬪嵆娑堢伃鍦颁富'], answerIndex: 1, explanation: '涓瓑锛氳祹閲戣繙瓒呭疄闄呭湴浠枫€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '淇勫浗璧颁笂璧勬湰涓讳箟鍙戝睍閬撹矾鐨勬爣蹇楁槸', options: ['褰煎緱涓€涓栨敼闈?, '1861骞村啘濂村埗鏀归潻', '鍗佹湀闈╁懡', '鑻忚仈鎴愮珛'], answerIndex: 1, explanation: '涓瓑锛氳祫鏈富涔夊彂灞曘€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€岃浣嶄細娣变俊锛屽嚒鑳藉缁存姢鍦颁富鍒╃泭鐨勬帾鏂斤紝閮戒竴涓€鍦板仛鍒颁簡銆傘€嶈瑷€璁哄嚭鑷?, options: ['褰煎緱涓€涓?, '浜氬巻灞卞ぇ浜屼笘', '鍒楀畞', '鏂ぇ鏋?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾敼闈╀繚鐣欐畫浣欍€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級淇勫浗1861骞存敼闈╃殑鎬ц川鏄?, options: ['鏃犱骇闃剁骇闈╁懡', '鑷笂鑰屼笅鐨勮祫浜ч樁绾ф€ц川鏀归潻', '鍐滃ゴ璧蜂箟', '绀句細涓讳箟闈╁懡'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃繘姝ヤ笌灞€闄愩€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝褰煎緱涓€涓栨敼闈╀笌1861骞存敼闈╋紝鍏卞悓鐐规槸', options: ['閮藉簾闄や簡鍐滃ゴ鍒?, '閮芥帹鍔ㄤ縿鍥借繎浠ｅ寲銆侀兘淇濈暀灏佸缓娈嬩綑', '閮芥敼鍙樹簡绀句細鎬ц川', '閮藉彂鐢熷湪19涓栫邯'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼縿鍥芥敼闈╁巻绋嬨€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級1861骞翠縿鍥藉啘濂村埗鏀归潻鐨勫眬闄愭€у湪浜?, options: ['娌℃湁瑙ｆ斁鍐滃ゴ', '淇濈暀浜嗗ぇ閲忓皝寤烘畫浣欍€佹矙鐨囦笓鍒剁粺娌绘病鍙?, '闃绘浜嗚祫鏈富涔夊彂灞?, '瀹炵幇浜嗗畬鍏ㄥ钩绛?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笉褰诲簳銆? },
    ],
  },

  {
    id: 'g-his-9b-3', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 娈栨皯鍦颁汉姘戠殑鍙嶆姉涓庤祫鏈富涔夊埗搴︾殑鎵╁睍', edition: '缁熺紪鐗?, section: '绗?璇?缇庡浗鍐呮垬',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍐呮垬璧峰洜', content: '鍗楀寳涓ょ缁忔祹鍒跺害鐭涚浘锛屽ゴ闅跺埗瀛樺簾銆? },
      { id: 'kp2', title: '鍖楁柟鑳滃埄', content: '1861鈥?865骞达紝鏋楄偗锛屻€婅В鏀鹃粦浜哄ゴ闅跺瑷€銆嬨€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '缇庡浗鍐呮垬鍓嶏紝鍗楀寳鍙屾柟鐭涚浘鐨勭劍鐐规槸', options: ['鍘熸枡闂', '濂撮毝鍒剁殑瀛樺簾闂', '鍏崇◣闂', '甯傚満闂'], answerIndex: 1, explanation: '绠€鍗曪細濂撮毝鍒跺瓨搴熴€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '棰嗗缇庡浗鍖楁柟璧㈠緱鍐呮垬鑳滃埄鐨勬€荤粺鏄?, options: ['鍗庣洓椤?, '鏋楄偗', '鏉版枑閫?, '缃楁柉绂?], answerIndex: 1, explanation: '绠€鍗曪細鏋楄偗銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鎵浆缇庡浗鍐呮垬鎴樺眬鐨勬硶寰嬫枃浠舵槸', options: ['銆婄嫭绔嬪瑷€銆?, '銆婅В鏀鹃粦浜哄ゴ闅跺瑷€銆嬩笌銆婂畢鍦版硶銆?, '銆?787骞村娉曘€?, '銆婁汉鏉冨瑷€銆?], answerIndex: 1, explanation: '绠€鍗曪細1862骞撮甯冦€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '缇庡浗鍐呮垬鐖嗗彂浜?, options: ['1775骞?, '1861骞?, '1865骞?, '1914骞?], answerIndex: 1, explanation: '涓瓑锛?861骞村崡鏂规寫璧枫€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '缇庡浗鍐呮垬缁撴潫浜?, options: ['1861骞?, '1865骞?, '1863骞?, '1877骞?], answerIndex: 1, explanation: '涓瓑锛?865骞村寳鏂硅儨鍒┿€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '銆婅В鏀鹃粦浜哄ゴ闅跺瑷€銆嬭瀹氫粠浣曟椂璧峰簾闄ゅ彌涔卞悇宸炲ゴ闅跺埗', options: ['1860骞村厓鏃?, '1863骞村厓鏃?, '1865骞村厓鏃?, '1861骞村厓鏃?], answerIndex: 1, explanation: '涓瓑锛?863骞?鏈?鏃ャ€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?863骞村厓鏈?鏃ヨ捣锛屽嚒褰撳湴浜烘皯灏氬湪鍙嶆姉鍚堜紬鍥界殑浠讳綍涓€宸炰箣鍐呪€︹€︿负浜哄崰鏈夎€屽仛濂撮毝鐨勪汉浠兘搴斿湪閭ｆ椂鍙婁互鍚庢案杩滆幏寰楄嚜鐢便€傘€嶈鏂囩尞鏄?, options: ['銆婄嫭绔嬪瑷€銆?, '銆婅В鏀鹃粦浜哄ゴ闅跺瑷€銆?, '銆婁汉鏉冨瑷€銆?, '銆?787骞村娉曘€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃В鏀鹃粦濂淬€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缇庡浗鍐呮垬鐨勫巻鍙叉剰涔夋槸', options: ['璧㈠緱浜嗗浗瀹剁嫭绔?, '缁存姢浜嗗浗瀹剁粺涓€銆佸簾闄や簡濂撮毝鍒躲€佹竻闄や簡璧勬湰涓讳箟鍙戝睍鏈€澶ч殰纰?, '搴熼櫎浜嗗啘濂村埗', '瀹炵幇浜嗕笁鏉冨垎绔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀浜屾璧勪骇闃剁骇闈╁懡銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝缇庡浗鐙珛鎴樹簤涓庣編鍥藉唴鎴橈紝鍚庤€呬富瑕佽В鍐崇殑鏄?, options: ['姘戞棌鐙珛闂', '鍥藉唴缁熶竴鍜屽ゴ闅跺埗瀛樺簾闂', '瀵瑰鎵╁紶闂', '澶栦氦瀛ょ珛闂'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼袱娆℃垬浜変笉鍚屼换鍔°€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏋楄偗鍦ㄧ編鍥藉巻鍙蹭笂鐨勪富瑕佽础鐚槸', options: ['鍒跺畾1787骞村娉?, '缁存姢鍥藉缁熶竴銆佽В鏀鹃粦浜哄ゴ闅?, '棰嗗鐙珛鎴樹簤', '鎺ㄨ缃楁柉绂忔柊鏀?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼紵澶ц础鐚€? },
    ],
  },

  {
    id: 'g-his-9b-4', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗竴鍗曞厓 娈栨皯鍦颁汉姘戠殑鍙嶆姉涓庤祫鏈富涔夊埗搴︾殑鎵╁睍', edition: '缁熺紪鐗?, section: '绗?璇?鏃ユ湰鏄庢不缁存柊',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍊掑箷杩愬姩', content: '1868骞存帹缈诲痉宸濆箷搴滐紝澶╃殗浜叉斂銆? },
      { id: 'kp2', title: '鏄庢不缁存柊', content: '1868骞磋捣锛屽悜瑗挎柟瀛︿範锛岃蛋涓婅祫鏈富涔夐亾璺€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp2', prompt: '鏃ユ湰鏄庢不缁存柊寮€濮嬩簬', options: ['1861骞?, '1868骞?, '1894骞?, '1869骞?], answerIndex: 1, explanation: '绠€鍗曪細1868骞淬€? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '鏄庢不缁存柊鐨勪富瀵煎姏閲忔槸', options: ['寰峰窛骞曞簻', '涓笅绾ф澹?, '澶╃殗鐙柇涓撹', '璧勪骇闃剁骇璁細'], answerIndex: 1, explanation: '绠€鍗曪細鍊掑箷娲句腑涓嬬骇姝﹀＋銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鏄庢不缁存柊鍦ㄧ粡娴庝笂鐨勬帾鏂芥槸', options: ['搴熻棭缃幙', '鎺ㄨ鍦扮◣鏀归潻銆佷互娈栦骇鍏翠笟涓哄彛鍙峰彂灞曡繎浠ｅ伐涓?, '鎻愬€℃枃鏄庡紑鍖?, '寤虹珛甯稿鍐?], answerIndex: 1, explanation: '绠€鍗曪細娈栦骇鍏翠笟銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鏄庢不缁存柊鍦ㄧぞ浼氱敓娲讳笂鎻愬€?, options: ['娈栦骇鍏翠笟', '鏂囨槑寮€鍖?, '搴熻棭缃幙', '瀵屽浗寮哄叺'], answerIndex: 1, explanation: '涓瓑锛氬悜娆х編瀛︿範鐢熸椿鏂瑰紡銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鏄庢不缁存柊鍦ㄦ斂娌讳笂鐨勬帾鏂芥槸', options: ['娈栦骇鍏翠笟', '搴熻棭缃幙銆佸姞寮轰腑澶泦鏉?, '鏂囨槑寮€鍖?, '瀵瑰鎵╁紶'], answerIndex: 1, explanation: '涓瓑锛氬姞寮轰腑澶泦鏉冦€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鏄庢不缁存柊鍓嶏紝鏃ユ湰鐨勫疄闄呯粺娌昏€呮槸', options: ['澶╃殗', '寰峰窛骞曞簻灏嗗啗', '澶у悕', '姝﹀＋'], answerIndex: 1, explanation: '涓瓑锛氬箷搴滄帉鎻″疄鏉冦€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屽ぇ鍑″浗涔嬪己寮憋紝鍐冲畾浜庝汉姘戜箣璐瘜锛屼汉姘戜箣璐瘜鍒欑郴浜庣墿浜т箣澶氬鈥︹€︺€嶄负姝ゆ棩鏈槑娌绘斂搴?, options: ['缁存姢骞曞簻缁熸不', '鎺ㄨ娈栦骇鍏翠笟銆佸彂灞曡繎浠ｅ伐涓?, '瀹炶閿佸浗鏀跨瓥', '搴熼櫎澶╃殗鍒?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾畺浜у叴涓氥€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏄庢不缁存柊瀵规棩鏈殑鏈€澶у奖鍝嶆槸', options: ['鎽嗚劚浜嗘皯鏃忓嵄鏈?, '浣挎棩鏈蛋涓婂彂灞曡祫鏈富涔夐亾璺€佸疄鐜板瘜鍥藉己鍏?, '搴熼櫎浜嗗啘濂村埗', '鎴愪负绀句細涓讳箟鍥藉'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽巻鍙茶浆鎶樸€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝淇勫浗1861骞存敼闈╀笌鏃ユ湰鏄庢不缁存柊锛屽叡鍚岀偣鏄?, options: ['閮芥帹缈讳簡骞曞簻缁熸不', '閮芥槸鑷笂鑰屼笅璧勪骇闃剁骇鎬ц川鏀归潻銆侀兘淇濈暀灏佸缓娈嬩綑', '閮藉彂鐢熷湪19涓栫邯60骞翠唬鍒?, '閮芥憜鑴变簡姘戞棌鍗辨満'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岃祫浜ч樁绾х粺娌绘墿澶с€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏄庢不缁存柊鐨勫眬闄愭€у湪浜?, options: ['娌℃湁鍙戝睍璧勬湰涓讳箟', '淇濈暀浜嗗ぇ閲忔棫鍒跺害娈嬩綑銆佽繀閫熻蛋涓婂澶栦镜鐣ユ墿寮犻亾璺?, '娌℃湁鍚戣タ鏂瑰涔?, '瀹炵幇浜嗗畬鍏ㄥ钩绛?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽啗鍥戒富涔夐殣鎮ｃ€? },
    ],
  },

  {
    id: 'g-his-9b-5', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 绗簩娆″伐涓氶潻鍛藉拰杩戜唬绉戝鏂囧寲', edition: '缁熺紪鐗?, section: '绗?璇?绗簩娆″伐涓氶潻鍛?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鐢靛姏骞挎硾搴旂敤', content: '19涓栫邯鍏竷鍗佸勾浠ｅ紑濮嬶紝鐢靛姏鏃朵唬銆? },
      { id: 'kp2', title: '鍐呯噧鏈轰笌鏂颁氦閫氬伐鍏?, content: '姹借溅銆侀鏈猴紝鐭虫补宸ヤ笟鍙戝睍銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绗簩娆″伐涓氶潻鍛藉紑濮嬩簬', options: ['18涓栫邯60骞翠唬', '19涓栫邯鍏竷鍗佸勾浠?, '19涓栫邯鏈?, '20涓栫邯鍒?], answerIndex: 1, explanation: '绠€鍗曪細19涓栫邯鍏竷鍗佸勾浠ｃ€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '绗簩娆″伐涓氶潻鍛戒娇浜虹被杩涘叆', options: ['钂告苯鏃朵唬', '鐢垫皵鏃朵唬', '淇℃伅鏃朵唬', '閾佸櫒鏃朵唬'], answerIndex: 1, explanation: '绠€鍗曪細鐢靛姏骞挎硾搴旂敤銆? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鐮斿埗鍑鸿€愮敤纰充笣鐏场銆佽绉颁负鍙戞槑澶х帇鐨勬槸', options: ['鐡︾壒', '鐖辫开鐢?, '鐗涢】', '鐖卞洜鏂潶'], answerIndex: 1, explanation: '绠€鍗曪細鐖辫开鐢熴€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍙戞槑鍐呯噧鏈哄拰鏃╂湡姹借溅鐨勫痉鍥藉伐绋嬪笀鏄?, options: ['鐡︾壒', '鍗″皵路鏈尐', '鑾辩壒鍏勫紵', '鍙茶拏鑺瓩'], answerIndex: 1, explanation: '涓瓑锛?885骞存湰鑼ㄦ苯杞︺€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1903骞存垚鍔熻瘯椋為鏈虹殑鏄?, options: ['鍗″皵路鏈尐', '鑾辩壒鍏勫紵', '鐖辫开鐢?, '绂忕壒'], answerIndex: 1, explanation: '涓瓑锛氱編鍥借幈鐗瑰厔寮熴€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '绗簩娆″伐涓氶潻鍛戒腑锛屽浜庨鍏堝湴浣嶇殑鍥藉鏄?, options: ['鑻卞浗鍜屾硶鍥?, '缇庡浗鍜屽痉鍥?, '鑻卞浗鍜岀編鍥?, '娉曞浗鍜屽痉鍥?], answerIndex: 1, explanation: '涓瓑锛氱編寰烽鍏堛€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?903骞?2鏈?7鏃ワ紝鑾辩壒鍏勫紵璁捐鐨勯琛岃€呬竴鍙峰湪绌轰腑椋炶浜?2绉掆€︹€︺€嶈繖涓€鍙戞槑灞炰簬', options: ['绗竴娆″伐涓氶潻鍛芥垚鏋?, '绗簩娆″伐涓氶潻鍛芥垚鏋溿€佸唴鐕冩満搴旂敤', '绗笁娆＄鎶€闈╁懡', '宸ュ満鎵嬪伐涓氭椂鏈?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼氦閫氶潻鏂般€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級绗簩娆″伐涓氶潻鍛界殑鏄捐憲鐗圭偣鏄?, options: ['鍙戞槑澶氬嚭鑷啛缁冨伐鍖?, '绉戝鐮旂┒鍚屽伐涓氱敓浜х揣瀵嗙粨鍚?, '浠ヨ捀姹芥満涓烘爣蹇?, '浜虹被杩涘叆淇℃伅鏃朵唬'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀鎶€缁撳悎銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝绗竴娆′笌绗簩娆″伐涓氶潻鍛斤紝鍚庤€呮柊鍦ㄤ簬', options: ['浠ヨ嫳鍥戒负鍞竴涓績', '浠ョ數鍔涘拰鍐呯噧鏈轰负鏍囧織銆佺編寰烽鍏?, '鍙戞槑澶氭潵鑷伐鍖犵粡楠?, '浜虹被杩涘叆钂告苯鏃朵唬'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾椂浠ｈ穬杩併€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級绗簩娆″伐涓氶潻鍛藉璧勬湰涓讳箟涓栫晫浣撶郴鐨勫奖鍝嶆槸', options: ['鑷敱璧勬湰涓讳箟钀岃娊', '涓昏璧勬湰涓讳箟鍥藉鍑虹幇鍨勬柇缁勭粐銆佽繘鍏ュ笣鍥戒富涔夐樁娈?, '灏佸缓鍒跺害纭珛', '绀句細涓讳箟瀹炵幇'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽笣鍥戒富涔夈€? },
    ],
  },

  {
    id: 'g-his-9b-6', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 绗簩娆″伐涓氶潻鍛藉拰杩戜唬绉戝鏂囧寲', edition: '缁熺紪鐗?, section: '绗?璇?宸ヤ笟鍖栧浗瀹剁殑绀句細鍙樺寲',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '浜哄彛澧為暱涓庡ぇ浼楁暀鑲?, content: '浜哄彛婵€澧烇紝鍒濈瓑鏁欒偛鏅強銆? },
      { id: 'kp2', title: '鍩庡競鍖栦笌绀句細闂', content: '鍩庡競鍖栨帹杩涳紝鐜姹℃煋銆佽传瀵屽垎鍖栥€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '宸ヤ笟闈╁懡鍚庯紝宸ヤ笟鍖栧浗瀹朵汉鍙?, options: ['鎬ュ墽鍑忓皯', '杩呴€熷闀?, '鍩烘湰涓嶅彉', '鍚戝啘鏉戝洖娴?], answerIndex: 1, explanation: '绠€鍗曪細鐢熶骇鍔涘彂灞曟帹鍔ㄤ汉鍙ｅ闀裤€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '19涓栫邯浠ュ悗锛屽伐涓氬寲鍥藉寮€濮嬫帹骞垮ぇ浼楁暀鑲诧紝涓昏鐩殑鏄?, options: ['婊¤冻宸ヤ笟鍖栧楂樼礌璐ㄥ姵鍔ㄥ姏鐨勯渶姹?, '璁╂墍鏈変汉閮戒笂澶у', '鏅強楂樼瓑鏁欒偛', '鎻愰珮璐垫棌鏂囧寲姘村钩'], answerIndex: 0, explanation: '绠€鍗曪細閫傚簲宸ヤ笟鍙戝睍闇€瑕併€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '宸ヤ笟闈╁懡鍚庯紝澶ч噺浜哄彛浠庡啘鏉戞秾鍏?, options: ['鍩庡競', '鐭垮北', '鍋忚繙涔℃潙', '娴峰娈栨皯鍦?], answerIndex: 0, explanation: '绠€鍗曪細鍩庡競鍖栥€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '宸ヤ笟鍖栬繘绋嬩腑鍑虹幇鐨勭ぞ浼氶棶棰樹笉鍖呮嫭', options: ['鐜姹℃煋', '璐瘜鍒嗗寲鍔犲墽', '鍩庡競鐜浼樼編', '浣忔埧绱у紶'], answerIndex: 2, explanation: '涓瓑锛氱幆澧冩伓鍖栥€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '鏈€鏃╁缓绔嬪浗瀹舵暀鑲蹭綋绯汇€佹帹琛屽垵绛変箟鍔℃暀鑲茬殑娆ф床鍥藉鏄?, options: ['鑻卞浗', '寰峰浗', '娉曞浗', '淇勫浗'], answerIndex: 1, explanation: '涓瓑锛氬痉鍥?9涓栫邯鍒濇帹琛屻€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍩庡競鍖栧甫鏉ョ殑绉瀬褰卞搷鏄?, options: ['鐜鎭跺寲', '淇冭繘缁忔祹鍙戝睍銆佹敼鍠勭敓娲绘柟寮?, '璐瘜鍒嗗寲', '浜ら€氭嫢鍫?], answerIndex: 1, explanation: '涓瓑锛氬煄甯傚寲鍙屽垉鍓戙€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼鸡鏁︹€︹€︾叅鐑熼伄钄藉ぉ绌猴紝娉版櫎澹渤姹℃按妯祦鈥︹€︺€嶈繖鍙嶆槧浜嗗伐涓氬寲杩涚▼涓?, options: ['鐜缇庡ソ', '鐜姹℃煋涓ラ噸', '鐢熸€佸钩琛?, '鐢熸椿瀹夐€?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岀幆澧冧唬浠枫€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級宸ヤ笟鍖栧浗瀹剁ぞ浼氬彉鍖栫殑琛ㄧ幇鏄?, options: ['浜哄彛閿愬噺', '浜哄彛澧為暱銆佸ぇ浼楁暀鑲叉櫘鍙娿€佸煄甯傚寲鎺ㄨ繘', '鍩庡競浜哄彛鍑忓皯', '浣撳姏鍔冲姩鑰呭澶?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀ぞ浼氬彉杩併€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級宸ヤ笟鍖栬繘绋嬩腑鍑虹幇鐨勫煄甯傜梾涓昏鏄?, options: ['椋庤皟闆ㄩ『', '鐜姹℃煋銆佷綇鎴跨揣寮犮€佽传瀵屽垎鍖?, '鍐滀笟涓版敹', '浜轰汉骞崇瓑'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀ぞ浼氶棶棰樸€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闈㈠宸ヤ笟鍖栧甫鏉ョ殑闂锛屾纭€佸害鏄?, options: ['鍥炲埌鍐滆€曟椂浠?, '鍦ㄥ彂灞曚腑娌荤悊鐜銆佽拷姹傚彲鎸佺画鍙戝睍', '鍋滄涓€鍒囧彂灞?, '鍏堟薄鏌撳悗娌荤悊'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀豢鑹插彂灞曘€? },
    ],
  },

  {
    id: 'g-his-9b-7', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簩鍗曞厓 绗簩娆″伐涓氶潻鍛藉拰杩戜唬绉戝鏂囧寲', edition: '缁熺紪鐗?, section: '绗?璇?杩戜唬绉戝涓庢枃鍖?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '绉戝宸ㄥ尃', content: '鐗涢】鍔涘銆佽揪灏旀枃杩涘寲璁恒€佺埍鍥犳柉鍧︾浉瀵硅銆? },
      { id: 'kp2', title: '鏂囧鑹烘湳', content: '宸村皵鎵庡厠銆佹墭灏旀柉娉般€佽礉澶氳姮銆佹⒌楂樸€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '杩戜唬鑷劧绉戝鐨勫鍩轰汉銆佸彂鐜颁竾鏈夊紩鍔涘畾寰嬬殑鏄?, options: ['杈惧皵鏂?, '鐗涢】', '鐖卞洜鏂潶', '鍝ョ櫧灏?], answerIndex: 1, explanation: '绠€鍗曪細鐗涢】銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍑虹増銆婄墿绉嶈捣婧愩€嬨€佹彁鍑鸿繘鍖栬鐨勬槸', options: ['鐗涢】', '杈惧皵鏂?, '鐖卞洜鏂潶', '浼忓皵娉?], answerIndex: 1, explanation: '绠€鍗曪細杈惧皵鏂囥€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '20涓栫邯鍒濇彁鍑虹浉瀵硅鐨勭瀛﹀鏄?, options: ['鐗涢】', '鐖卞洜鏂潶', '杈惧皵鏂?, '灞呴噷澶汉'], answerIndex: 1, explanation: '绠€鍗曪細鐖卞洜鏂潶銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '銆婃垬浜変笌鍜屽钩銆嬬殑浣滆€呮槸', options: ['宸村皵鎵庡厠', '鍒楀か路鎵樺皵鏂嘲', '浣嗕竵', '鑾庡＋姣斾簹'], answerIndex: 1, explanation: '涓瓑锛氫縿鍥芥枃瀛﹀法鍖犮€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '寰峰浗澶╂墠闊充箰瀹躲€併€婅嫳闆勪氦鍝嶆洸銆嬬殑浣滆€呮槸', options: ['鑾墡鐗?, '璐濆鑺?, '宸磋但', '鑸掍集鐗?], answerIndex: 1, explanation: '涓瓑锛氳礉澶氳姮銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鑽峰叞鍚庡嵃璞℃淳鐢诲銆併€婂悜鏃ヨ懙銆嬬殑浣滆€呮槸', options: ['姣曞姞绱?, '姊甸珮锛堝嚒路楂橈級', '杈韭疯姮濂?, '绫冲紑鏈楃惇缃?], answerIndex: 1, explanation: '涓瓑锛氭⒌楂樸€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屼竴鍒囩敓鐗╅兘涓嶆槸绁為€犵殑锛岃€屾槸鍦ㄨ嚜鐒堕€夋嫨涓紝鐢辩畝鍗曞埌澶嶆潅銆佺敱浣庣瓑鍒伴珮绛変笉鏂繘鍖栫殑銆傘€嶈瑙傜偣鍑鸿嚜', options: ['鐗涢】', '杈惧皵鏂囥€婄墿绉嶈捣婧愩€?, '鐖卞洜鏂潶', '浼忓皵娉?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃繘鍖栬銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鐗涢】鍦ㄨ繎浠ｇ瀛︿笂鐨勪富瑕佽础鐚槸', options: ['鎻愬嚭鐢熺墿杩涘寲璁?, '杩戜唬鑷劧绉戝鐨勫鍩轰汉銆佸缓绔嬬粡鍏稿姏瀛︿綋绯?, '鎻愬嚭鐩稿璁?, '鍙戠幇鐢电鎰熷簲鐜拌薄'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀粡鍏稿姏瀛︺€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍒楀か路鎵樺皵鏂嘲琚垪瀹佺О涓?, options: ['淇勫浗鏂囧涔嬬埗', '淇勫浗闈╁懡鐨勯暅瀛?, '鐜颁唬鎴忓墽涔嬬埗', '娴极涓讳箟璇椾汉'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽弽鏄犵ぞ浼氱幇瀹炪€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鐗涢】銆佽揪灏旀枃銆佺埍鍥犳柉鍧︼紝浠栦滑鍏卞悓涔嬪鏄?, options: ['閮藉弽瀵逛笂甯濋€犱汉', '閮藉湪鑷劧绉戝棰嗗煙浣滃嚭鍒掓椂浠ｈ础鐚€佹帹鍔ㄦ€濇兂瑙ｆ斁', '閮界敓浜庡痉鍥?, '閮芥槸鎶€鏈彂鏄庡'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀瀛︾簿绁炪€? },
    ],
  },

  {
    id: 'g-his-9b-8', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 绗竴娆′笘鐣屽ぇ鎴樺拰鎴樺悗鍒濇湡鐨勪笘鐣?, edition: '缁熺紪鐗?, section: '绗?璇?绗竴娆′笘鐣屽ぇ鎴?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓ゅぇ鍐涗簨闆嗗洟', content: '涓夊浗鍚岀洘銆佷笁鍥藉崗绾︼紝鐤媯鎵╁啗澶囨垬銆? },
      { id: 'kp2', title: '鎴樹簤杩涚▼', content: '1914鈥?918骞达紝钀ㄦ媺鐑獫浜嬩欢锛屽嚒灏旂櫥鎴樺焦銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绗竴娆′笘鐣屽ぇ鎴樺墠褰㈡垚鐨勪笁鍥藉悓鐩熸槸', options: ['寰峰浗銆佸ゥ鍖堝笣鍥姐€佹剰澶у埄', '鑻卞浗銆佹硶鍥姐€佷縿鍥?, '寰峰浗銆佹棩鏈€佹剰澶у埄', '缇庡浗銆佽嫳鍥姐€佹硶鍥?], answerIndex: 0, explanation: '绠€鍗曪細寰峰浗銆佸ゥ鍖堝笣鍥姐€佹剰澶у埄銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '涓夊浗鍗忕害鏄?, options: ['寰峰浗銆佸ゥ鍖堝笣鍥姐€佹剰澶у埄', '鑻卞浗銆佹硶鍥姐€佷縿鍥?, '寰峰浗銆佹棩鏈€佹剰澶у埄', '缇庡浗銆佽嫳鍥姐€佽嫃鑱?], answerIndex: 1, explanation: '绠€鍗曪細鑻卞浗銆佹硶鍥姐€佷縿鍥姐€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '绗竴娆′笘鐣屽ぇ鎴樼垎鍙戠殑瀵肩伀绾挎槸', options: ['鏉ュ厠鏄熼】鏋０', '钀ㄦ媺鐑獫浜嬩欢', '鐝嶇彔娓簨浠?, '鍑″皵鐧绘垬褰?], answerIndex: 1, explanation: '绠€鍗曪細1914骞?鏈堛€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '绗竴娆′笘鐣屽ぇ鎴樿捣姝㈡椂闂存槸', options: ['1914鈥?918骞?, '1939鈥?945骞?, '1914鈥?917骞?, '1910鈥?914骞?], answerIndex: 0, explanation: '涓瓑锛?914鈥?918銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '琚О涓虹粸鑲夋満銆佹渶鎯ㄧ儓鐨勬垬褰规槸', options: ['椹仼娌虫垬褰?, '鍑″皵鐧绘垬褰?, '绱㈠娌虫垬褰?, '鏃ュ痉鍏版捣鎴?], answerIndex: 1, explanation: '涓瓑锛?916骞村嚒灏旂櫥銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '涓€鎴樼垎鍙戠殑鏍规湰鍘熷洜鏄?, options: ['钀ㄦ媺鐑獫浜嬩欢', '甯濆浗涓讳箟鍥藉鏀挎不缁忔祹鍙戝睍涓嶅钩琛?, '涓ゅぇ鍐涗簨闆嗗洟褰㈡垚', '姘戞棌澶嶄粐鎯呯华'], answerIndex: 1, explanation: '涓瓑锛氬笣鍥戒富涔夌煕鐩俱€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屾暣涓爲鏋楄鍓婂钩寰楀儚鍓插幓璋风鐨勭敯鍦扳€︹€﹀埌澶勯兘鏄畫楠搞€佸嚮鐮寸殑鎴樿溅鈥︹€︺€嶈鎻忚堪鍙嶆槧鐨勬槸', options: ['婊戦搧鍗㈡垬褰?, '鍑″皵鐧绘垬褰圭殑娈嬮叿', '鏂ぇ鏋楁牸鍕掓垬褰?, '璇烘浖搴曠櫥闄?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾垬浜夋儴鐑堛€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绗竴娆′笘鐣屽ぇ鎴樼殑鎬ц川鏄?, options: ['鍙嶆硶瑗挎柉鎴樹簤', '甯濆浗涓讳箟鎺犲ず鎴樹簤锛堝灏旂淮浜氱瓑涓烘皯鏃忚嚜鍗級', '姝ｄ箟鐨勮В鏀炬垬浜?, '浜烘皯闈╁懡鎴樹簤'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄潪姝ｄ箟銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓€鎴樺墠涓夊浗鍚岀洘涓庝笁鍥藉崗绾︼紝瀹冧滑鐨勫疄璐ㄦ槸', options: ['缁存姢鍜屽钩缁勭粐', '甯濆浗涓讳箟鍐涗簨渚电暐闆嗗洟', '鍥介檯鑱旂洘', '鍙嶅瀯鏂悓鐩?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼簤闇搁泦鍥€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級绗竴娆′笘鐣屽ぇ鎴樼粰浜虹被鐨勫惎绀烘槸', options: ['鎴樹簤鏄己鍥戒箣璺?, '鍙嶅鎴樹簤銆佺弽鐖卞拰骞炽€侀€氳繃鍗忓晢瑙ｅ喅鍥介檯浜夌', '鍐涘绔炶禌鏈夊埄', '鍐涗簨缁撶洘鎵嶅畨鍏?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼互鍙蹭负閴淬€? },
    ],
  },

  {
    id: 'g-his-9b-9', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 绗竴娆′笘鐣屽ぇ鎴樺拰鎴樺悗鍒濇湡鐨勪笘鐣?, edition: '缁熺紪鐗?, section: '绗?璇?涓€鎴樺悗鐨勫浗闄呭叧绯?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?璇? },
    knowledgePoints: [
      { id: 'kp1', title: '宸撮粠鍜屼細', content: '1919骞达紝銆婂嚒灏旇禌鏉＄害銆嬶紝鍑″皵璧涗綋绯汇€? },
      { id: 'kp2', title: '鍗庣洓椤夸細璁笌鍥介檯鑱旂洘', content: '1921鈥?922骞达紝銆婁節鍥藉叕绾︺€嬶紝鍑″皵璧涒€斿崕鐩涢】浣撶郴銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '宸撮粠鍜屼細鍙紑浜?, options: ['1918骞?, '1919骞?, '1921骞?, '1939骞?], answerIndex: 1, explanation: '绠€鍗曪細1919骞淬€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '宸撮粠鍜屼細鐨勬搷绾靛浗鏄?, options: ['鑻卞浗銆佹硶鍥姐€佺編鍥?, '寰峰浗銆佸ゥ鍖堛€佹剰澶у埄', '涓浗銆佺編鍥姐€佽嫃鑱?, '鏃ユ湰銆佹剰澶у埄銆佸痉鍥?], answerIndex: 0, explanation: '绠€鍗曪細涓夊法澶淬€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍗庣洓椤夸細璁笂閽堝涓浗闂绛剧讲鐨勬潯绾︽槸', options: ['銆婂嚒灏旇禌鏉＄害銆?, '銆婁節鍥藉叕绾︺€?, '銆婅仈鍚堝浗瀹跺瑷€銆?, '銆婂寳澶цタ娲嬪叕绾︺€?], answerIndex: 1, explanation: '绠€鍗曪細1922骞淬€婁節鍥藉叕绾︺€嬨€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '宸撮粠鍜屼細涓婏紝鎶婂痉鍥藉湪灞变笢鐨勬潈鐩婅浆浜ょ粰', options: ['涓浗', '鏃ユ湰', '缇庡浗', '娉曞浗'], answerIndex: 1, explanation: '涓瓑锛氬紩鍙戜簲鍥涚埍鍥借繍鍔ㄣ€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '涓€鎴樺悗寤虹珛鐨勫浗闄呯粍缁囨槸', options: ['鑱斿悎鍥?, '鍥介檯鑱旂洘', '涓栫晫璐告槗缁勭粐', '娆х洘'], answerIndex: 1, explanation: '涓瓑锛氬浗闄呰仈鐩熴€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓€鎴樺悗甯濆浗涓讳箟纭珛鐨勫浗闄呯З搴忚绉颁负', options: ['闆呭皵濉斾綋绯?, '鍑″皵璧涒€斿崕鐩涢】浣撶郴', '甯冮浄椤挎．鏋椾綋绯?, '缁翠篃绾充綋绯?], answerIndex: 1, explanation: '涓瓑锛氭垬鍚庝綋绯汇€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屽痉鍥界殑鍏ㄩ儴娴峰娈栨皯鍦扮敱鑻便€佹硶銆佹棩绛夊浗浠ュ浠荤粺娌诲舰寮忓姞浠ョ摐鍒嗏€︹€︺€嶈鏉愭枡鍑鸿嚜', options: ['銆婁節鍥藉叕绾︺€?, '銆婂嚒灏旇禌鏉＄害銆?, '銆婅仈鍚堝浗瀹跺瑷€銆?, '銆婂紑缃楀瑷€銆?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽垎璧冧細璁€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級銆婁節鍥藉叕绾︺€嬪涓浗鐨勫奖鍝嶆槸', options: ['灏婇噸浜嗕腑鍥戒富鏉?, '浣夸腑鍥藉洖澶嶅埌鍑犱釜甯濆浗涓讳箟鍥藉鍏卞悓鏀厤鐨勫眬闈?, '鏀跺洖浜嗗北涓滀富鏉?, '搴熼櫎浜嗘不澶栨硶鏉?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄棬鎴峰紑鏀俱€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍑″皵璧涒€斿崕鐩涢】浣撶郴鐨勫疄璐ㄦ槸', options: ['缁存姢涓栫晫鍜屽钩', '甯濆浗涓讳箟閲嶆柊鐡滃垎涓栫晫銆佸ゴ褰规畺姘戝湴鍗婃畺姘戝湴鐨勪綋绯?, '淇冭繘鍥介檯鍚堜綔', '瀹炵幇浜嗗ぇ灏忓浗骞崇瓑'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笉鍏浣撶郴銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍥介檯鑱旂洘涓庤仈鍚堝浗锛屽叡鍚岀偣鏄?, options: ['閮界敱缇庡浗涓诲', '閮芥槸涓栫晫澶ф垬鍚庡缓绔嬬殑鍥介檯缁勭粐', '閮界淮鎶や簡鎸佷箙鍜屽钩', '閮芥湁鏉冩瑁呭共棰勪竴鍒?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽浗闄呯粍缁囥€? },
    ],
  },

  {
    id: 'g-his-9b-10', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 绗竴娆′笘鐣屽ぇ鎴樺拰鎴樺悗鍒濇湡鐨勪笘鐣?, edition: '缁熺紪鐗?, section: '绗?0璇?鍒楀畞涓庡崄鏈堥潻鍛?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '浜屾湀闈╁懡', content: '1917骞?鏈堟帹缈绘矙鐨囦笓鍒讹紝涓や釜鏀挎潈骞跺瓨銆? },
      { id: 'kp2', title: '鍗佹湀闈╁懡', content: '1917骞?1鏈堝郊寰楁牸鍕掓瑁呰捣涔夛紝绗竴涓ぞ浼氫富涔夊浗瀹躲€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1917骞?鏈堜縿鍥戒簩鏈堥潻鍛芥帹缈荤殑鏄?, options: ['璧勪骇闃剁骇涓存椂鏀垮簻', '娌欑殗涓撳埗缁熸不', '鑻忕淮鍩冩斂鏉?, '鍐滃ゴ鍒?], answerIndex: 1, explanation: '绠€鍗曪細鎺ㄧ炕缃楁浖璇哄か鐜嬫湞銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '棰嗗淇勫浗鍗佹湀闈╁懡鐨勬槸', options: ['鏂ぇ鏋?, '鍒楀畞', '椹厠鎬?, '璧瞾鏅撳か'], answerIndex: 1, explanation: '绠€鍗曪細鍒楀畞銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍗佹湀闈╁懡鐖嗗彂浜?, options: ['1917骞?0鏈?, '1917骞?1鏈堬紙淇勫巻10鏈堬級', '1918骞?1鏈?, '1921骞?], answerIndex: 1, explanation: '绠€鍗曪細褰煎緱鏍煎嫆姝﹁璧蜂箟銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '浜屾湀闈╁懡鍚庯紝淇勫浗鍑虹幇鐨勪袱涓斂鏉冨苟瀛樺眬闈㈡槸鎸?, options: ['娌欑殗鏀垮簻鍜岃嫃缁村焹', '璧勪骇闃剁骇涓存椂鏀垮簻鍜屽伐浜哄＋鍏典唬琛ㄨ嫃缁村焹', '浜烘皯濮斿憳浼氬拰鏉滈┈', '鍓嶇嚎鍙镐护閮ㄥ拰鍚庢柟鏀垮簻'], answerIndex: 1, explanation: '涓瓑锛氫复鏃舵斂搴滄帉鎻″疄鏉冦€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鍗佹湀闈╁懡鍚庯紝淇勫浗寤虹珛鐨勬斂鏉冩槸', options: ['璧勪骇闃剁骇涓存椂鏀垮簻', '浜烘皯濮斿憳浼氾紙鑻忕淮鍩冩斂鏉冿級', '娌欑殗鏀垮簻', '绔嬪浼氳'], answerIndex: 1, explanation: '涓瓑锛氫笘鐣屼笂绗竴涓ぞ浼氫富涔夊浗瀹躲€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '褰煎緱鏍煎嫆姝﹁璧蜂箟鐨勬€绘寚鎸ラ儴鏄?, options: ['鍐', '鏂帿灏斿凹瀹?, '鍏嬮噷濮嗘灄瀹?, '澶忓'], answerIndex: 1, explanation: '涓瓑锛氭柉鑾皵灏煎銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?917骞?1鏈?鏃ワ紝闃胯姍涔愬皵鍙峰贰娲嬭埌鍙戝嚭浜嗚繘鏀诲啲瀹殑淇″彿鈥︹€︺€嶈浜嬩欢鏄?, options: ['浜屾湀闈╁懡', '鍗佹湀闈╁懡锛堝郊寰楁牸鍕掓瑁呰捣涔夛級', '淇勫浗鍐滃ゴ鍒舵敼闈?, '鑻忚仈鎴愮珛'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾敾鎵撳啲瀹€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級淇勫浗鍗佹湀闈╁懡鐨勫巻鍙叉剰涔夋槸', options: ['鎺ㄧ炕浜嗘矙鐨囦笓鍒?, '寤虹珛浜嗕笘鐣屼笂绗竴涓ぞ浼氫富涔夊浗瀹躲€佸紑鍒涚ぞ浼氫富涔夐潻鍛芥柊绾厓', '缁撴潫浜嗗啘濂村埗', '瀹炵幇浜嗗伐涓氬寲'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽垝鏃朵唬鎰忎箟銆? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝浜屾湀闈╁懡涓庡崄鏈堥潻鍛斤紝鍚庤€呮€ц川鏄?, options: ['璧勪骇闃剁骇姘戜富闈╁懡', '绀句細涓讳箟闈╁懡', '姘戞棌瑙ｆ斁杩愬姩', '鍐滃ゴ璧蜂箟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼袱娆￠潻鍛芥€ц川銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍗佹湀闈╁懡瀵逛腑鍥界殑褰卞搷鏄?, options: ['寮曞彂娲嬪姟杩愬姩', '缁欎腑鍥介€佹潵浜嗛┈鍏嬫€濆垪瀹佷富涔夈€佹帹鍔ㄤ簡鏂版枃鍖栬繍鍔ㄥ拰浜斿洓杩愬姩', '瀵艰嚧鎴婃垖鍙樻硶', '寮曞彂杈涗亥闈╁懡'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼笢椋庨€侀洦銆? },
    ],
  },

  {
    id: 'g-his-9b-11', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 绗竴娆′笘鐣屽ぇ鎴樺拰鎴樺悗鍒濇湡鐨勪笘鐣?, edition: '缁熺紪鐗?, section: '绗?1璇?鑻忚仈鐨勭ぞ浼氫富涔夊缓璁?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鏂扮粡娴庢斂绛?, content: '1921骞村垪瀹侊紝鍒╃敤甯傚満鍟嗗搧璐у竵鍏崇郴銆? },
      { id: 'kp2', title: '鑻忚仈鎴愮珛涓庢柉澶ф灄妯″紡', content: '1922骞磋嫃鑱旀垚绔嬶紝宸ヤ笟鍖栥€佸啘涓氶泦浣撳寲銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1921骞磋嫃淇勫紑濮嬪疄琛?, options: ['鎴樻椂鍏变骇涓讳箟鏀跨瓥', '鏂扮粡娴庢斂绛?, '鍐滀笟闆嗕綋鍖?, '绗竴涓簲骞磋鍒?], answerIndex: 1, explanation: '绠€鍗曪細鏂扮粡娴庢斂绛栥€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鏂扮粡娴庢斂绛栫殑鐗圭偣鏄?, options: ['瀹炶浣欑伯鏀堕泦鍒?, '鍒╃敤甯傚満鍜屽晢鍝佽揣甯佸叧绯诲彂灞曠粡娴?, '鍙栨秷鑷敱璐告槗', '鍏ㄩ儴宸ヤ笟鍥芥湁鍖?], answerIndex: 1, explanation: '绠€鍗曪細鍏佽澶氱缁忔祹骞跺瓨銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鑻忚仈鎴愮珛浜?, options: ['1917骞?, '1922骞?, '1924骞?, '1936骞?], answerIndex: 1, explanation: '绠€鍗曪細1922骞村簳銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鑻忚仈妯″紡锛堟柉澶ф灄妯″紡锛夊舰鎴愮殑鏍囧織鏄?, options: ['鏂扮粡娴庢斂绛栧疄鏂?, '1936骞磋嫃鑱旀柊瀹硶棰佸竷', '绗竴涓簲骞磋鍒掑畬鎴?, '鑻忚仈鎴愮珛'], answerIndex: 1, explanation: '涓瓑锛氭爣蹇楃ぞ浼氫富涔夊埗搴︾‘绔嬨€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鑻忚仈宸ヤ笟鍖栫殑閲嶇偣鏄?, options: ['杞诲伐涓?, '閲嶅伐涓?, '鍐滀笟', '鍟嗕笟'], answerIndex: 1, explanation: '涓瓑锛氫紭鍏堝彂灞曢噸宸ヤ笟銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '20涓栫邯30骞翠唬锛岃嫃鑱斿啘涓氭帹琛?, options: ['瀹跺涵鑱斾骇鎵垮寘', '闆嗕綋鍖栵紙寤虹珛闆嗕綋鍐滃簞锛?, '鍦熷湴鏀归潻', '绉熷湴鍐滃満鍒?], answerIndex: 1, explanation: '涓瓑锛氬啘涓氶泦浣撳寲銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屾垜浠繕涓嶈兘瀹炵幇浠庡皬鐢熶骇鍒扮ぞ浼氫富涔夌殑鐩存帴杩囨浮鈥︹€︽墍浠ユ垜浠簲璇ュ埄鐢ㄨ祫鏈富涔変綔涓哄皬鐢熶骇鍜岀ぞ浼氫富涔夌殑涓棿鐜妭銆傘€嶄负姝よ嫃淇勫疄琛?, options: ['鎴樻椂鍏变骇涓讳箟', '鏂扮粡娴庢斂绛?, '鍐滀笟闆嗕綋鍖?, '楂樺害闆嗕腑璁″垝缁忔祹'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄棿鎺ヨ繃娓°€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鏂扮粡娴庢斂绛栫殑閲嶈鎰忎箟鏄?, options: ['瀹炵幇浜嗗伐涓氬寲', '璋冨姩浜嗙敓浜ц€呯Н鏋佹€с€佸珐鍥轰簡宸ュ啘鑱旂洘銆佽繀閫熺紦瑙ｅ嵄鏈?, '瀹炵幇浜嗗啘涓氶泦浣撳寲', '鐩存帴杩囨浮鍒板叡浜т富涔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾帰绱㈡柊璺€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鏂ぇ鏋楁ā寮忕殑涓昏寮婄鏄?, options: ['鍥芥皯缁忔祹姣斾緥鍗忚皟', '楂樺害闆嗕腑銆佹帓鏂ュ競鍦恒€佺墖闈㈠彂灞曢噸宸ヤ笟', '绀句細涓讳箟姘戜富鍏呭垎', '鍐滀笟杞诲伐涓氬彂杈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼綋鍒跺兊鍖栥€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鎴樻椂鍏变骇涓讳箟鏀跨瓥涓庢柊缁忔祹鏀跨瓥锛屽悗鑰呮柊鍦?, options: ['瀹炶浣欑伯鏀堕泦鍒?, '鍒╃敤甯傚満鍜屽晢鍝佽揣甯佸叧绯诲彂灞曠敓浜у姏', '鍙栨秷鍟嗗搧璐告槗', '鍏ㄩ儴浼佷笟鍥芥湁'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾斂绛栬皟鏁淬€? },
    ],
  },

  {
    id: 'g-his-9b-12', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗笁鍗曞厓 绗竴娆′笘鐣屽ぇ鎴樺拰鎴樺悗鍒濇湡鐨勪笘鐣?, edition: '缁熺紪鐗?, section: '绗?2璇?浜氶潪鎷夋皯鏃忔皯涓昏繍鍔ㄧ殑楂樻定',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍗板害闈炴毚鍔涗笉鍚堜綔杩愬姩', content: '鐢樺湴棰嗗锛屽弽鎶楄嫳鍥芥畺姘戙€? },
      { id: 'kp2', title: '鍩冨強鍗庡か鑴辫繍鍔ㄤ笌澧ㄨタ鍝ュ崱寰风撼鏂敼闈?, content: '姘戞棌姘戜富杩愬姩銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '棰嗗鍗板害闈炴毚鍔涗笉鍚堜綔杩愬姩鐨勬槸', options: ['灏艰但椴?, '鐢樺湴', '鐪熺撼', '绾宠禌灏?], answerIndex: 1, explanation: '绠€鍗曪細鐢樺湴琚О涓哄湥闆勩€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鐢樺湴棰嗗鐨勯潪鏆村姏涓嶅悎浣滆繍鍔ㄥ弽鎶楃殑鏄?, options: ['娉曞浗', '鑻卞浗娈栨皯缁熸不', '鑽峰叞', '钁¤悇鐗?], answerIndex: 1, explanation: '绠€鍗曪細鍙嶆姉鑻卞浗銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓€鎴樺悗鍩冨強浜夊彇鐙珛鐨勮繍鍔ㄦ槸', options: ['闈炴毚鍔涗笉鍚堜綔', '鍗庡か鑴辫繍鍔?, '鏄庢不缁存柊', '鍗″痉绾虫柉鏀归潻'], answerIndex: 1, explanation: '绠€鍗曪細鍗庡か鑴卞厷棰嗗銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '20涓栫邯鍒濆ⅷ瑗垮摜璧勪骇闃剁骇姘戜富鏀归潻鐨勯瀵间汉鏄?, options: ['鐢樺湴', '鍗″痉绾虫柉', '鎵庢牸椴佸皵', '鐜诲埄鐡﹀皵'], answerIndex: 1, explanation: '涓瓑锛氬崱寰风撼鏂敼闈┿€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '闈炴毚鍔涗笉鍚堜綔杩愬姩涓紝鐢樺湴鍙戝姩鐨勫叿鏈変唬琛ㄦ€х殑琛屽姩鏄?, options: ['姝﹁璧蜂箟', '椋熺洂闀垮緛锛堝弽瀵归鐩愪笓钀ユ硶锛?, '璁細璇锋効', '鍏ㄩ潰缃㈠伐缃㈠競'], answerIndex: 1, explanation: '涓瓑锛氶鐩愯繘鍐涖€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍗庡か鑴辫繍鍔ㄧ殑棰嗗浜烘槸', options: ['鐢樺湴', '鎵庢牸椴佸皵', '鍗″痉绾虫柉', '灏艰但椴?], answerIndex: 1, explanation: '涓瓑锛氭墡鏍奸瞾灏斻€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€屾垜骞朵笉鎯抽タ璋侊紝涔熶笉鎯虫墦璋佲€︹€︿絾鎴戣鍧氭寔鐪熺悊锛岀敤鍜屽钩鐨勬柟寮忓弽鎶椾笉鍏銆傘€嶈鎬濇兂鏈€鍙兘鍑鸿嚜', options: ['鍒楀畞', '鐢樺湴鐨勯潪鏆村姏鎬濇兂', '鎷跨牬浠?, '鍏嬩鸡濞佸皵'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岄潪鏆村姏銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鍗板害闈炴毚鍔涗笉鍚堜綔杩愬姩鐨勫巻鍙蹭綔鐢ㄦ槸', options: ['鐩存帴璧㈠緱浜嗙嫭绔?, '鎵撳嚮浜嗚嫳鍥芥畺姘戠粺娌汇€佸寮轰簡鍗板害浜烘皯姘戞棌鎰忚瘑', '瀹炵幇浜嗗嵃宸村垎娌?, '搴熼櫎浜嗙濮撳埗搴?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾皯鏃忚閱掋€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍗板害闈炴毚鍔涗笉鍚堜綔杩愬姩涓庡焹鍙婂崕澶劚杩愬姩锛屽叡鍚岀偣鏄?, options: ['閮界敱璧勪骇闃剁骇鍙戝姩鏆村姏闈╁懡', '閮芥槸涓€鎴樺悗浜氶潪姘戞棌姘戜富杩愬姩楂樻定鐨勮〃鐜?, '閮藉彂鐢熷湪浜氭床', '閮藉彇寰椾簡瀹屽叏鐙珛'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾皯鏃忚閱掓氮娼€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍗″痉绾虫柉鏀归潻鐨勬€ц川鏄?, options: ['灏佸缓鎬ц川鏀归潻', '璧勪骇闃剁骇姘戜富鏀归潻', '绀句細涓讳箟鏀归潻', '鍐滃ゴ鍒舵敼闈?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾皯涓昏繘姝ャ€? },
    ],
  },

  {
    id: 'g-his-9b-13', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗洓鍗曞厓 璧勬湰涓讳箟缁忔祹澶у嵄鏈哄拰绗簩娆′笘鐣屽ぇ鎴?, edition: '缁熺紪鐗?, section: '绗?3璇?璧勬湰涓讳箟缁忔祹澶у嵄鏈?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?3璇? },
    knowledgePoints: [
      { id: 'kp1', title: '1929鈥?933骞村ぇ鍗辨満', content: '浠庣編鍥藉紑濮嬶紝甯嵎璧勬湰涓讳箟涓栫晫銆? },
      { id: 'kp2', title: '缃楁柉绂忔柊鏀?, content: '1933骞达紝鍥藉骞查缁忔祹锛屽浗瀹跺瀯鏂祫鏈富涔夈€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '1929鈥?933骞磋祫鏈富涔夌粡娴庡ぇ鍗辨満棣栧厛鐖嗗彂浜?, options: ['鑻卞浗', '缇庡浗', '娉曞浗', '寰峰浗'], answerIndex: 1, explanation: '绠€鍗曪細浠庣編鍥界航绾﹁偂甯傚穿婧冨紑濮嬨€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '缁忔祹澶у嵄鏈虹殑鐗圭偣涓嶅寘鎷?, options: ['鎸佺画鏃堕棿闀?, '娑夊強鑼冨洿骞?, '鐮村潖鎬уぇ', '鍙尝鍙婁竴涓浗瀹?], answerIndex: 3, explanation: '绠€鍗曪細甯嵎鏁翠釜璧勬湰涓讳箟涓栫晫銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鎺ㄨ缃楁柉绂忔柊鏀跨殑缇庡浗鎬荤粺鏄?, options: ['鑳′經', '瀵屽叞鍏嬫灄路缃楁柉绂?, '濞佸皵閫?, '鏋楄偗'], answerIndex: 1, explanation: '绠€鍗曪細1933骞翠笂鍙般€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '缃楁柉绂忔柊鏀跨殑涓績鎺柦鏄?, options: ['璋冩暣鍐滀笟', '鍔犲己瀵瑰伐涓氱殑璁″垝鎸囧锛堛€婂浗瀹跺伐涓氬鍏存硶銆嬶級', '鍏村缓鍏叡宸ョ▼', '鏁撮】閲戣瀺浣撶郴'], answerIndex: 1, explanation: '涓瓑锛氬宸ヤ笟璋冩暣銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '缃楁柉绂忔柊鏀跨殑绐佸嚭鐗圭偣鏄?, options: ['鑷敱鏀句换', '鍥藉鍔犲己瀵圭粡娴庣殑骞查鍜屾寚瀵?, '瀹炶璁″垝缁忔祹', '搴熼櫎绉佹湁鍒?], answerIndex: 1, explanation: '涓瓑锛氬浗瀹跺共棰勩€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '涓哄噺灏戝け涓氥€佹帹琛屼互宸ヤ唬璧堬紝缃楁柉绂忔斂搴?, options: ['鐩存帴鍙戞斁鏁戞祹閲?, '澶у姏鍏村缓鍏叡宸ョ▼', '鍙栨秷绀句細鏁戞祹', '榧撳姳鍚戝绉绘皯'], answerIndex: 1, explanation: '涓瓑锛氬叴鍔炲叕鍏卞伐绋嬨€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€?929骞?0鏈?4鏃ワ紝缇庡浗绾界害鑲″競鑲＄エ浠锋牸鏆磋穼鈥︹€︿竴澶滀箣闂达紝鎴愬崈涓婁竾浜虹牬浜с€傘€嶈鏉愭枡鎻忚堪鐨勬槸', options: ['涓€鎴樼垎鍙?, '1929鈥?933骞寸粡娴庡ぇ鍗辨満', '浜屾垬鐖嗗彂', '鐭虫补鍗辨満'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽ぇ鍗辨満銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缃楁柉绂忔柊鏀跨殑鍘嗗彶浣滅敤鏄?, options: ['鏍归櫎浜嗙粡娴庡嵄鏈?, '缇庡浗缁忔祹缂撴參鎭㈠銆佷汉姘戠敓娲绘敼鍠勩€佽祫鏈富涔夊埗搴﹀緱鍒拌皟鏁村珐鍥?, '瀹炵幇浜嗙ぞ浼氫富涔?, '娑堥櫎浜嗚传瀵屽樊璺?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽埗搴﹁皟鏁淬€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝缃楁柉绂忔柊鏀夸笌鏂ぇ鏋楁ā寮忥紝浜岃€呭叡鍚岀偣鏄?, options: ['閮藉疄琛屽競鍦虹粡娴?, '閮藉己璋冨浗瀹跺缁忔祹鐨勫共棰勫拰璁″垝', '閮藉簾闄ょ鏈夊埗', '閮藉彂鐢熷湪20涓栫邯鍒?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽浗瀹跺共棰勩€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級缃楁柉绂忔柊鏀跨殑瀹炶川鏄?, options: ['鏀瑰彉璧勬湰涓讳箟鍒跺害', '鍦ㄧ淮鎶よ祫鏈富涔夊埗搴﹀墠鎻愪笅浣滃嚭鐨勬斂绛栬皟鏁?, '搴熼櫎绉佹湁鍒?, '瀹炶绀句細涓讳箟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀敓浜у叧绯诲眬閮ㄨ皟鏁淬€? },
    ],
  },

  {
    id: 'g-his-9b-14', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗洓鍗曞厓 璧勬湰涓讳箟缁忔祹澶у嵄鏈哄拰绗簩娆′笘鐣屽ぇ鎴?, edition: '缁熺紪鐗?, section: '绗?4璇?娉曡タ鏂浗瀹剁殑渚电暐鎵╁紶',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?4璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鎰忓痉鏃ユ硶瑗挎柉', content: '1922鎰忓ぇ鍒╁ⅷ绱㈤噷灏硷紝1933寰峰浗甯岀壒鍕掞紝1936鏃ユ湰鍐涢儴銆? },
      { id: 'kp2', title: '娆т簹鎴樹簤绛栨簮鍦?, content: '娆ф床绛栨簮鍦板痉鍥斤紝浜氭床绛栨簮鍦版棩鏈€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '鎰忓ぇ鍒╂硶瑗挎柉鏀挎潈鐨勫缓绔嬭€呮槸', options: ['甯岀壒鍕?, '澧ㄧ储閲屽凹', '涓滄潯鑻辨満', '缃楁柉绂?], answerIndex: 1, explanation: '绠€鍗曪細1922骞村ⅷ绱㈤噷灏笺€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '寰峰浗娉曡タ鏂ご瀛愭槸', options: ['澧ㄧ储閲屽凹', '甯岀壒鍕?, '涓滄潯鑻辨満', '鎷跨牬浠?], answerIndex: 1, explanation: '绠€鍗曪細甯岀壒鍕掋€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '绗簩娆′笘鐣屽ぇ鎴樼殑娆ф床鎴樹簤绛栨簮鍦板舰鎴愪簬', options: ['鎰忓ぇ鍒?, '寰峰浗', '鏃ユ湰', '瑗跨彮鐗?], answerIndex: 1, explanation: '绠€鍗曪細1933骞村笇鐗瑰嫆涓婂彴銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '浜氭床鎴樹簤绛栨簮鍦板舰鎴愪簬', options: ['寰峰浗', '鏃ユ湰', '鎰忓ぇ鍒?, '涓浗'], answerIndex: 1, explanation: '涓瓑锛氭棩鏈啗閮ㄦ硶瑗挎柉銆? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '寰峰浗绾崇补鍏氬埗閫犵殑銆佹墦鍑诲叡浜у厷鐨勪簨浠舵槸', options: ['姘存櫠涔嬪', '鍥戒細绾电伀妗?, '鎱曞凹榛戦槾璋?, '闂嚮娉㈠叞'], answerIndex: 1, explanation: '涓瓑锛?933骞村浗浼氱旱鐏銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '绾崇补寰峰浗鎺ㄨ绉嶆棌鐏粷鏀跨瓥銆佹畫閰疯揩瀹崇殑涓昏瀵硅薄鏄?, options: ['鍚夋櫘璧涗汉', '鐘瑰お浜?, '鏂媺澶汉', '娈嬬柧浜?], answerIndex: 1, explanation: '涓瓑锛氬弽鐘圭媯娼€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€?933骞达紝甯岀壒鍕掍笂鍙板悗锛岄€愭笎闆嗗厷銆佹斂銆佸啗澶ф潈浜庝竴韬€︹€﹀埗閫犲浗浼氱旱鐏銆佹畫閰疯揩瀹崇姽澶汉銆傘€嶈鏉愭枡鍙嶆槧鐨勬槸', options: ['缃楁柉绂忔柊鏀?, '寰峰浗娉曡タ鏂笓鏀垮缓绔?, '鏃ユ湰鏄庢不缁存柊', '鎰忓ぇ鍒╃粺涓€'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屾硶瑗挎柉缁熸不銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級娆т簹鎴樹簤绛栨簮鍦板舰鎴愮殑鍏卞悓鍘熷洜鏄?, options: ['閮芥帹琛屾柊鏀?, '閮藉彈缁忔祹澶у嵄鏈烘墦鍑汇€佽蛋涓婃硶瑗挎柉鎵╁紶閬撹矾', '閮芥垬鑳滀簡灏佸缓鍔垮姏', '閮藉疄鐜颁簡宸ヤ笟鍖?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽嵄鏈衡啋娉曡タ鏂€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝寰锋棩娉曡タ鏂笌鎰忓ぇ鍒╂硶瑗挎柉锛屽叡鍚岀偣鏄?, options: ['閮界敱鏀垮厷閫変妇涓婂彴', '閮藉鍐呯嫭瑁併€佸澶栦镜鐣ユ墿寮?, '閮芥病鏈夊啗閮?, '閮藉弽瀵瑰叡浜т富涔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾硶瑗挎柉鏈川銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闈㈠娉曡タ鏂墿寮狅紝鑻便€佹硶绛夊浗閲囧彇鐨勬斂绛栨槸', options: ['鍧氬喅鍒惰', '缁ラ潠鏀跨瓥锛堝Ε鍗忕旱瀹癸級', '寮虹‖瀵规姉', '鍐涗簨缁撶洘'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀互闈栧姪鐕冩垬鐏€? },
    ],
  },

  {
    id: 'g-his-9b-15', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗洓鍗曞厓 璧勬湰涓讳箟缁忔祹澶у嵄鏈哄拰绗簩娆′笘鐣屽ぇ鎴?, edition: '缁熺紪鐗?, section: '绗?5璇?绗簩娆′笘鐣屽ぇ鎴?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?5璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍏ㄩ潰鐖嗗彂涓庢墿澶?, content: '1939寰峰浗闂嚮娉㈠叞锛?941鑻忓痉鎴樹簤銆佸お骞虫磱鎴樹簤銆? },
      { id: 'kp2', title: '鍙嶆硶瑗挎柉鑳滃埄', content: '銆婅仈鍚堝浗瀹跺瑷€銆嬨€佹柉澶ф灄鏍煎嫆鎴樺焦銆佽鏇煎簳鐧婚檰銆?945鑳滃埄銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绗簩娆′笘鐣屽ぇ鎴樺叏闈㈢垎鍙戠殑鏍囧織鏄?, options: ['寰峰浗鍚炲苟濂ュ湴鍒?, '寰峰浗绐佽娉㈠叞銆佽嫳娉曞寰峰鎴?, '寰峰浗绐佽鑻忚仈', '鏃ユ湰鍋疯鐝嶇彔娓?], answerIndex: 1, explanation: '绠€鍗曪細1939骞?鏈?鏃ャ€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '浜屾垬瑙勬ā杩涗竴姝ユ墿澶с€佽揪鍒版渶澶ц妯＄殑浜嬩欢鏄?, options: ['寰峰浗绐佽娉㈠叞', '鏃ユ湰鍋疯鐝嶇彔娓€佸お骞虫磱鎴樹簤鐖嗗彂', '寰峰浗绐佽鑻忚仈', '璇烘浖搴曠櫥闄?], answerIndex: 1, explanation: '绠€鍗曪細1941骞?2鏈?鏃ャ€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓栫晫鍙嶆硶瑗挎柉鑱旂洘姝ｅ紡褰㈡垚鐨勬爣蹇楁槸', options: ['銆婂ぇ瑗挎磱瀹珷銆?, '銆婅仈鍚堝浗瀹跺瑷€銆嬬缃?, '銆婂紑缃楀瑷€銆?, '闆呭皵濉斾細璁?], answerIndex: 1, explanation: '绠€鍗曪細1942骞?鏈堛€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '绗簩娆′笘鐣屽ぇ鎴樼殑杞姌鐐规槸', options: ['鑾柉绉戜繚鍗垬', '鏂ぇ鏋楁牸鍕掓垬褰?, '璇烘浖搴曠櫥闄?, '鏌忔灄鎴樺焦'], answerIndex: 1, explanation: '涓瓑锛?942鈥?943骞淬€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '1944骞?鏈?鏃ワ紝寮€杈熸娲茬浜屾垬鍦虹殑鎴樺焦鏄?, options: ['鏂ぇ鏋楁牸鍕掓垬褰?, '璇烘浖搴曠櫥闄?, '鏌忔灄鎴樺焦', '涓€斿矝娴锋垬'], answerIndex: 1, explanation: '涓瓑锛氳鏇煎簳鐧婚檰銆? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '鍐冲畾鎴愮珛鑱斿悎鍥界殑鍥介檯浼氳鏄?, options: ['寮€缃椾細璁?, '闆呭皵濉斾細璁?, '寰烽粦鍏颁細璁?, '娉㈣尐鍧︿細璁?], answerIndex: 1, explanation: '涓瓑锛?945骞撮泤灏斿銆? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?945骞?鏈?鏃ワ紝寰峰浗姝ｅ紡绛剧讲鎶曢檷涔︼紱9鏈?鏃ワ紝鏃ユ湰姝ｅ紡绛剧讲鎶曢檷涔︺€傘€嶈繖鏍囧織鐫€', options: ['浜屾垬娆ф床鎴樹簨缁撴潫', '绗簩娆′笘鐣屽ぇ鎴樻渶缁堣儨鍒╃粨鏉?, '绗竴娆′笘鐣屽ぇ鎴樼粨鏉?, '鍐锋垬寮€濮?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽弽娉曡タ鏂儨鍒┿€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓栫晫鍙嶆硶瑗挎柉鎴樹簤鑳滃埄鐨勬牴鏈師鍥犳槸', options: ['缇庡浗鎶曟幏鍘熷瓙寮?, '涓栫晫鍙嶆硶瑗挎柉鍥藉鑱斿悎浣滄垬锛堝浗闄呭弽娉曡タ鏂粺涓€鎴樼嚎锛?, '鑻忚仈绾㈠啗鍙傛垬', '娉曡タ鏂唴閮ㄥ垎瑁?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽洟缁撳氨鏄姏閲忋€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓€鎴樹笌浜屾垬锛屼簩鎴樼殑鎬ц川鏄?, options: ['甯濆浗涓讳箟鎺犲ず鎴樹簤', '涓栫晫浜烘皯鍙嶆硶瑗挎柉鎴樹簤', '姘戞棌瑙ｆ斁鎴樹簤', '娈栨皯浜夐湼鎴樹簤'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾涔夊弽娉曡タ鏂€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓栫晫鍙嶆硶瑗挎柉鎴樹簤鑳滃埄缁欐垜浠殑鍚ず鏄?, options: ['鎴樹簤鏄己鍥戒箣璺?, '鍙嶅鎴樹簤銆佺弽鐖卞拰骞炽€佸姞寮哄浗闄呭悎浣?, '闇告潈涓讳箟鏈夊埄', '鍐涗簨缁撶洘鎵嶅畨鍏?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼互鍙蹭负閴淬€? },
    ],
  },

  {
    id: 'g-his-9b-16', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簲鍗曞厓 绗簩娆′笘鐣屽ぇ鎴樺悗鐨勪笘鐣屽彉鍖?, edition: '缁熺紪鐗?, section: '绗?6璇?鍐锋垬鐨勫彂鐢熶笌涓ゆ瀬鏍煎眬鐨勫舰鎴?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?6璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍐锋垬寮€濮?, content: '1947鏉滈瞾闂ㄤ富涔夛紝鍐锋垬姝ｅ紡寮€濮嬨€? },
      { id: 'kp2', title: '涓ゆ瀬鏍煎眬褰㈡垚', content: '鍖楃害1949銆佸崕绾?955锛屼袱鏋佹牸灞€褰㈡垚銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '缇庤嫃鍐锋垬姝ｅ紡寮€濮嬬殑鏍囧織鏄?, options: ['涓樺悏灏旈搧骞曟紨璇?, '鏉滈瞾闂ㄤ富涔夊嚭鍙?, '椹瓏灏旇鍒?, '鍖楃害鎴愮珛'], answerIndex: 1, explanation: '绠€鍗曪細1947骞存潨椴侀棬涓讳箟銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '缇庡浗鎺ㄨ鎻村姪瑗挎鐨勭粡娴庤鍒掓槸', options: ['鏉滈瞾闂ㄤ富涔?, '椹瓏灏旇鍒掞紙娆ф床澶嶅叴璁″垝锛?, '鑾礇鎵樺か璁″垝', '绗洓鐐硅鍒?], answerIndex: 1, explanation: '绠€鍗曪細椹瓏灏旇鍒掋€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '鍖楀ぇ瑗挎磱鍏害缁勭粐鎴愮珛浜?, options: ['1945骞?, '1949骞?, '1955骞?, '1991骞?], answerIndex: 1, explanation: '绠€鍗曪細1949骞淬€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '鍗庢矙鏉＄害缁勭粐鎴愮珛浜?, options: ['1949骞?, '1955骞?, '1945骞?, '1991骞?], answerIndex: 1, explanation: '涓瓑锛?955骞村崕绾︺€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '涓ゆ瀬鏍煎眬姝ｅ紡褰㈡垚鐨勬爣蹇楁槸', options: ['鏉滈瞾闂ㄤ富涔夊嚭鍙?, '鍖楃害鍜屽崕绾︿袱澶ч泦鍥㈠叏闈㈠宄?, '椹瓏灏旇鍒?, '寰峰浗鍒嗚'], answerIndex: 1, explanation: '涓瓑锛氫袱鏋佹牸灞€銆? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '鍐锋垬涓紝缇庤嫃鍙屾柟閲囧彇鐨勫鎶楁柟寮忔槸', options: ['鐩存帴姝﹁杩涙敾', '闄ょ洿鎺ユ瑁呰繘鏀诲鐨勪竴鍒囨晫瀵硅鍔?, '鑱斿悎浜夐湼', '缁忔祹浜掕ˉ'], answerIndex: 1, explanation: '涓瓑锛氶潪鐩存帴鎴樹簤瀵规姉銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岀編鍥藉皢閲囧彇鏈夊姏鐨勮鍔ㄦ潵鏀寔鑷敱鍒跺害锛岄槻姝㈤泦鏉冩斂鏉冪殑鎵╁紶鈥︹€︺€嶈瑷€璁哄嚭鑷?, options: ['椹瓏灏?, '鏉滈瞾闂ㄤ富涔?, '涓樺悏灏?, '鏂ぇ鏋?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽喎鎴樺瑷€銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓ゆ瀬鏍煎眬鐨勪富瑕佺壒鐐规槸', options: ['鍗曟瀬鐙湼', '缇庤嫃涓ゆ瀬瀵瑰硻銆佸喎鎴樹负涓汇€佷袱澶ч樀钀ュ绔?, '澶氭瀬鍖栬秼鍔?, '缁忔祹鍏ㄧ悆鍖?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄泤灏斿浣撶郴銆? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鏉滈瞾闂ㄤ富涔変笌椹瓏灏旇鍒掞紝鍏卞悓鐐规槸', options: ['閮芥槸鍐涗簨鍚岀洘', '閮芥槸鍐锋垬鏀跨瓥鐨勮〃鐜般€侀亸鍒惰嫃鑱?, '閮芥槸缁忔祹鎻村姪', '閮芥槸鏀挎不瀹ｈ█'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽喎鎴樼粍鍚堟嫵銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級涓ゆ瀬鏍煎眬缁撴潫鐨勬爣蹇楁槸', options: ['鏉滈瞾闂ㄤ富涔?, '1991骞村簳鑻忚仈瑙ｄ綋', '鍗庣害鎴愮珛', '鍖楃害涓滄墿'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾牸灞€婕斿彉銆? },
    ],
  },

  {
    id: 'g-his-9b-17', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簲鍗曞厓 绗簩娆′笘鐣屽ぇ鎴樺悗鐨勪笘鐣屽彉鍖?, edition: '缁熺紪鐗?, section: '绗?7璇?浜屾垬鍚庤祫鏈富涔夊浗瀹剁殑鍙樺寲',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?7璇? },
    knowledgePoints: [
      { id: 'kp1', title: '缇庡浗鍙戝睍涓庤タ娆ц仈鍚?, content: '缇庡浗鎴愪负瓒呯骇澶у浗锛屾鍏变綋鈫掓鐩熴€? },
      { id: 'kp2', title: '鏃ユ湰宕涜捣涓庣ぞ浼氫繚闅?, content: '鏃ユ湰鎴愪负璧勬湰涓讳箟绗簩缁忔祹澶у浗銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '20涓栫邯60骞翠唬锛岃タ娆у浗瀹朵负鎻愰珮鍥介檯鍦颁綅銆佽仈鍚堣捣鏉ユ垚绔嬩簡', options: ['鍥介檯鑱旂洘', '娆ф床鍏卞悓浣?, '鍖楀ぇ瑗挎磱鍏害缁勭粐', '涓栫晫璐告槗缁勭粐'], answerIndex: 1, explanation: '绠€鍗曪細娆у叡浣撱€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '娆х洘鎴愮珛浜?, options: ['1967骞?, '1993骞?, '1999骞?, '2002骞?], answerIndex: 1, explanation: '绠€鍗曪細1993骞存鐩熴€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '1968骞达紝鎴愪负璧勬湰涓讳箟涓栫晫绗簩缁忔祹澶у浗鐨勬槸', options: ['缇庡浗', '鏃ユ湰', '鑻卞浗', '鑱旈偊寰峰浗'], answerIndex: 1, explanation: '绠€鍗曪細鏃ユ湰銆? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '20涓栫邯90骞翠唬浠ュ悗锛岀編鍥借繘鍏ユ柊缁忔祹鏃朵唬锛屽叾鐗瑰緛鏄?, options: ['鏈烘鍖栧拰鐢垫皵鍖?, '淇℃伅鍖栧拰鍏ㄧ悆鍖?, '宸ヤ笟鍖栧拰鍩庡競鍖?, '鑷姩鍖栧拰閲嶅寲'], answerIndex: 1, explanation: '涓瓑锛氭柊缁忔祹鐗瑰緛銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '鎴樺悗鏃ユ湰缁忔祹杩呴€熷彂灞曠殑澶栭儴鍘熷洜鏄?, options: ['姘戜富鍖栨敼闈?, '缇庡浗鎵舵寔鍜屽啗闇€璁㈣揣', '閲嶈鏁欒偛', '绉戞妧绔嬪浗'], answerIndex: 1, explanation: '涓瓑锛氱編鍥芥壎妞嶃€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '娆х洘鐨勬€ц川鏄?, options: ['鍐涗簨鍚岀洘', '娆ф床鏀挎不缁忔祹涓€浣撳寲缁勭粐', '鑷敱璐告槗鍖?, '閭﹁仈鍒跺浗瀹?], answerIndex: 1, explanation: '涓瓑锛氫竴浣撳寲缁勭粐銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€?993骞达紝澶ч儴鍒嗚タ娆у浗瀹跺湪娆у叡浣撳熀纭€涓婄粍鎴愪簡娆ф床鑱旂洘銆傘€嶆鐩熸垚绔嬬殑閲嶈浣滅敤鏄?, options: ['瀹炵幇浜嗘娲插畬鍏ㄧ粺涓€', '鏋佸ぇ淇冭繘浜嗚タ娆х粡娴庡彂灞曞拰鍥介檯鍦颁綅鎻愰珮', '娑堥櫎浜嗗悇鍥界煕鐩?, '寤虹珛浜嗗崟鏋佷笘鐣?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃仈鍚堣嚜寮恒€? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鎴樺悗鏃ユ湰缁忔祹杩呴€熷彂灞曠殑鍘熷洜涓嶅寘鎷?, options: ['姘戜富鍖栨敼闈?, '鎺ㄨ鍥芥皯缁忔祹鍐涗簨鍖?, '閲嶈绉戞妧鏁欒偛', '缇庡浗鎵舵寔'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彂灞曞師鍥犮€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝娆у叡浣撲笌娆х洘锛屽悗鑰呮柊鍦ㄤ簬', options: ['鍙湪缁忔祹棰嗗煙鍚堜綔', '浠庣粡娴庝竴浣撳寲璧板悜缁忔祹鏀挎不涓€浣撳寲', '鍙槸鑷敱璐告槗鍖?, '鍙槸鍐涗簨鍚岀洘'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼竴浣撳寲娣卞寲銆? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浜屾垬鍚庤祫鏈富涔夊浗瀹剁粡娴庡彂灞曠殑涓昏鍘熷洜鏄?, options: ['鎺ㄨ鏂扮殑娈栨皯鎺犲ず', '鍥藉鍔犲己瀹忚璋冩帶銆佸埄鐢ㄧ涓夋绉戞妧闈╁懡鎴愭灉', '搴熼櫎绉佹湁鍒?, '瀹炶璁″垝缁忔祹'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾柊鍙樺寲銆? },
    ],
  },

  {
    id: 'g-his-9b-18', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簲鍗曞厓 绗簩娆′笘鐣屽ぇ鎴樺悗鐨勪笘鐣屽彉鍖?, edition: '缁熺紪鐗?, section: '绗?8璇?绀句細涓讳箟鐨勬洸鎶樺彂灞曚笌濂嬭捣',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?8璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鑻忚仈鏀归潻涓庤В浣?, content: '璧瞾鏅撳か銆佸媰鍒楁棩娑呭か銆佹垐灏斿反涔斿か鏀归潻锛?991骞磋嫃鑱旇В浣撱€? },
      { id: 'kp2', title: '涓滄鍓у彉涓庝腑鍥界壒鑹茬ぞ浼氫富涔?, content: '1989涓滄鍓у彉锛屼腑鍥芥敼闈╁紑鏀炬垚鍔熴€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '20涓栫邯50骞翠唬锛屽鏂ぇ鏋楁ā寮忚繘琛屾敼闈╃殑鑻忚仈棰嗗浜烘槸', options: ['鏂ぇ鏋?, '璧瞾鏅撳か', '鍕冨垪鏃ユ秴澶?, '鎴堝皵宸翠箶澶?], answerIndex: 1, explanation: '绠€鍗曪細璧瞾鏅撳か鏀归潻銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鑻忚仈瑙ｄ綋鍙戠敓浜?, options: ['1989骞?, '1991骞?, '1990骞?, '1993骞?], answerIndex: 1, explanation: '绠€鍗曪細1991骞村簳銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '涓滄鍓у彉鍙戠敓浜?, options: ['1956骞?, '1989骞?, '1991骞?, '1978骞?], answerIndex: 1, explanation: '绠€鍗曪細1989骞淬€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '瀵艰嚧鑻忚仈瑙ｄ綋鐨勭洿鎺ユ敼闈╄€呮槸', options: ['璧瞾鏅撳か', '鎴堝皵宸翠箶澶?, '鍕冨垪鏃ユ秴澶?, '鍙跺埄閽?], answerIndex: 1, explanation: '涓瓑锛氭垐灏斿反涔斿か鏀归潻澶辨帶銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '涓滄鍓у彉鍜岃嫃鑱旇В浣撶殑瀹炶川鏄?, options: ['鍥藉鍚嶇О鍙樺寲', '绀句細鍒跺害鍙戠敓鏍规湰鎬у彉鍖?, '鎵ф斂鍏氭洿鎹?, '棰嗗浜烘洿鏇?], answerIndex: 1, explanation: '涓瓑锛氳祫鏈富涔夊杈熴€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '闈㈠鍥介檯椋庝簯鍙樺够锛屼腑鍥藉潥鎸?, options: ['鐓ф惉鑻忚仈妯″紡', '涓浗鐗硅壊绀句細涓讳箟閬撹矾銆佹敼闈╁紑鏀?, '鍋滄涓€鍒囨敼闈?, '闂叧閿佸浗'], answerIndex: 1, explanation: '涓瓑锛氶亾璺嚜淇°€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€?991骞?2鏈堬紝淇勭綏鏂瓑11涓姞鐩熷叡鍜屽浗棰嗗浜虹缃层€婇樋鎷夋湪鍥惧瑷€銆嬶紝姝ｅ紡瀹ｅ竷鎴愮珛鐙珛鍥藉鑱斿悎浣擄紝鑻忚仈鍋滄瀛樺湪銆傘€嶈浜嬩欢鏄?, options: ['涓滄鍓у彉', '鑻忚仈瑙ｄ綋', '鍗庣害鎴愮珛', '鍐锋垬寮€濮?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃嫃鑱旇惤骞曘€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級鑻忚仈瑙ｄ綋鐨勬牴鏈師鍥犳槸', options: ['瑗挎柟鍜屽钩婕斿彉', '鏂ぇ鏋楁ā寮忕殑鍍靛寲銆侀暱鏈熺Н绱殑鍗辨満鎬荤垎鍙?, '鎴堝皵宸翠箶澶釜浜哄け璇?, '姘戞棌鐭涚浘'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼綋鍒跺兊鍖栥€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓滄鍓у彉銆佽嫃鑱旇В浣撲笌涓浗鏀归潻寮€鏀撅紝缁欐垜浠殑鍚ず鏄?, options: ['绀句細涓讳箟褰诲簳澶辫触', '绀句細涓讳箟瑕佸湪鏀归潻涓嚜鎴戝畬鍠勩€佽蛋绗﹀悎鏈浗鍥芥儏鐨勯亾璺?, '绀句細涓讳箟涓€鎴愪笉鍙?, '蹇呴』鏀惧純鍏氱殑棰嗗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岄亾璺€夋嫨銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級璧瞾鏅撳か鏀归潻鏈€缁堝け璐ワ紝璇存槑', options: ['鑻忚仈鏀归潻涓嶅繀瑕?, '娌℃湁浠庢牴鏈笂绐佺牬鏂ぇ鏋楁ā寮?, '鏀归潻鏂瑰悜瀹屽叏閿欒', '搴旇绔嬪嵆瑙ｄ綋'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾敼闈╀笉褰诲簳銆? },
    ],
  },

  {
    id: 'g-his-9b-19', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗簲鍗曞厓 绗簩娆′笘鐣屽ぇ鎴樺悗鐨勪笘鐣屽彉鍖?, edition: '缁熺紪鐗?, section: '绗?9璇?浜氶潪鎷夊浗瀹剁殑鎴愰暱',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?9璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓囬殕浼氳涓庨潪娲茬嫭绔嬪勾', content: '1955涓囬殕浼氳锛?960闈炴床鐙珛骞淬€? },
      { id: 'kp2', title: '鎷夌編鏂椾簤涓庝笉缁撶洘杩愬姩', content: '鍙ゅ反闈╁懡銆佸反鎷块┈鏀跺洖杩愭渤涓绘潈銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '绗竴娆℃病鏈夋畺姘戝浗瀹跺弬鍔犵殑浜氶潪浼氳鏄?, options: ['鏃ュ唴鐡︿細璁?, '涓囬殕浼氳', 'APEC浼氳', '鑱斿ぇ鐗瑰埆浼氳'], answerIndex: 1, explanation: '绠€鍗曪細1955骞翠竾闅嗐€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '琚О涓洪潪娲茬嫭绔嬪勾鐨勬槸', options: ['1947骞?, '1960骞?, '1990骞?, '1959骞?], answerIndex: 1, explanation: '绠€鍗曪細17涓浗瀹剁嫭绔嬨€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鏍囧織鐫€鎵€鏈夐潪娲插浗瀹堕兘鎽嗚劚娈栨皯鏋烽攣鐨勪簨浠舵槸', options: ['1960骞撮潪娲茬嫭绔嬪勾', '1990骞寸撼绫虫瘮浜氱嫭绔?, '鍩冨強鏀跺洖鑻忎紛澹繍娌?, '鏇煎痉鎷夊綋閫夋€荤粺'], answerIndex: 1, explanation: '绠€鍗曪細1990骞寸撼绫虫瘮浜氥€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '棰嗗鍙ゅ反璧颁笂绀句細涓讳箟閬撹矾鐨勬槸', options: ['鍗℃柉鐗圭綏', '鍒嚶锋牸鐡︽媺', '搴囬殕', '闃胯繛寰?], answerIndex: 0, explanation: '涓瓑锛氬崱鏂壒缃椼€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '宸存嬁椹汉姘戜粠缇庡浗鎵嬩腑鏀跺洖杩愭渤涓绘潈鏄湪', options: ['1959骞?, '1999骞村簳', '1960骞?, '1979骞?], answerIndex: 1, explanation: '涓瓑锛?999骞淬€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '浜屾垬鍚庯紝浜氶潪鎷夊浗瀹朵负缁存姢鐙珛銆佽皨姹傚彂灞曞叴璧风殑杩愬姩鏄?, options: ['涓嶇粨鐩熻繍鍔?, '鍖楃害缁勭粐', '鍗庣害缁勭粐', '娆х洘'], answerIndex: 0, explanation: '涓瓑锛氫笉缁撶洘杩愬姩銆? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岃繖鏄垜鏈夊垢鍙傚姞鐨勭涓€娆＄湡姝ｈ嚜鐢辩殑銆佺敱浜氶潪浜烘皯鑷繁涓绘寔鐨勪細璁€傘€嶈浼氳鏄?, options: ['鏃ュ唴鐡︿細璁?, '涓囬殕浼氳', '闆呭皵濉斾細璁?, '娉㈣尐鍧︿細璁?], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屼竾闅嗙簿绁炪€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓囬殕浼氳鐨勫巻鍙叉剰涔夋槸', options: ['寤虹珛浜嗚仈鍚堝浗', '褰㈡垚浜嗕竾闅嗙簿绁炪€佷績杩涗簹闈炲浗瀹跺洟缁撳悎浣?, '瀹炵幇浜嗕簹闈炵粺涓€', '娑堥櫎浜嗘畺姘戜富涔?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屼竾闅嗙簿绁炪€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍗板害鐙珛涓庨潪娲茬嫭绔嬫氮娼紝鍏卞悓鐐规槸', options: ['閮藉彂鐢熷湪19涓栫邯', '閮芥槸浜屾垬鍚庢皯鏃忚В鏀捐繍鍔ㄩ珮娑ㄧ殑琛ㄧ幇', '閮界敱鍏变骇鍏氶瀵?, '閮藉疄鐜颁簡绀句細涓讳箟'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾畺姘戜綋绯诲穿婧冦€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級1990骞寸撼绫虫瘮浜氱嫭绔嬫爣蹇楃潃', options: ['闈炴床鍏ㄩ儴瑙ｆ斁', '娆ф床娈栨皯浣撶郴鍦ㄩ潪娲叉渶缁堝穿婧?, '浜氶潪浼氳鍙紑', '涓嶇粨鐩熻繍鍔ㄥ叴璧?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾畺姘戜綋绯荤摝瑙ｃ€? },
    ],
  },

  {
    id: 'g-his-9b-20', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗叚鍗曞厓 褰撲唬涓栫晫鐨勪富瑕佸彂灞曡秼鍔?, edition: '缁熺紪鐗?, section: '绗?0璇?褰撲唬涓栫晫鍙戝睍鐨勫熀鏈壒鐐?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?0璇? },
    knowledgePoints: [
      { id: 'kp1', title: '涓栫晫澶氭瀬鍖?, content: '鑻忚仈瑙ｄ綋鍚庯紝缇庡浗鍗曡竟涓讳箟锛屽鏋佸寲瓒嬪娍銆? },
      { id: 'kp2', title: '缁忔祹鍏ㄧ悆鍖?, content: '1995骞翠笘璐哥粍缁囷紝鍏ㄧ悆鍖栧姞閫熴€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '褰撲粖涓栫晫鏀挎不鏍煎眬鐨勫彂灞曡秼鍔挎槸', options: ['鍗曟瀬鏍煎眬', '澶氭瀬鍖栬秼鍔?, '涓ゆ瀬鏍煎眬', '涓夋瀬鏍煎眬'], answerIndex: 1, explanation: '绠€鍗曪細涓€瓒呭寮恒€佸鏋佸寲銆? },
      { id: 'q2', knowledgePointId: 'kp2', prompt: '涓栫晫璐告槗缁勭粐鎴愮珛浜?, options: ['1945骞?, '1995骞?, '2001骞?, '1991骞?], answerIndex: 1, explanation: '绠€鍗曪細1995骞淬€? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '缁忔祹鍏ㄧ悆鍖栫殑閲嶈琛ㄧ幇涓嶅寘鎷?, options: ['鍥介檯璐告槗澶у箙澧為暱', '璐瘜宸窛缂╁皬', '璺ㄥ浗鍏徃褰卞搷澧炲ぇ', '涓栫晫璐告槗缁勭粐鎴愮珛'], answerIndex: 1, explanation: '绠€鍗曪細鍏ㄧ悆鍖栨媺澶у崡鍖楀樊璺濄€? },
      { id: 'q4', knowledgePointId: 'kp1', prompt: '鑻忚仈瑙ｄ綋鍚庯紝鎴愪负鍞竴瓒呯骇澶у浗鐨勬槸', options: ['淇勭綏鏂?, '缇庡浗', '涓浗', '鏃ユ湰'], answerIndex: 1, explanation: '涓瓑锛氱編鍥藉崟杈逛富涔夈€? },
      { id: 'q5', knowledgePointId: 'kp1', prompt: '褰撲粖涓栫晫锛岀壍鍒剁編鍥界О闇搞€佷績杩涘鏋佸寲鐨勯噸瑕佸姏閲忎笉鍖呮嫭', options: ['娆х洘', '淇勭綏鏂€佷腑鍥姐€佹棩鏈?, '缇庡浗', '鍙戝睍涓浗瀹?], answerIndex: 2, explanation: '涓瓑锛氬寮恒€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '缁忔祹鍏ㄧ悆鍖栦腑锛屾壆婕旈噸瑕佽鑹茬殑鏄?, options: ['灏忔墜宸ヤ綔鍧?, '璺ㄥ浗鍏徃', '涓綋鍐滄埛', '灏忓瀷鍟嗗簵'], answerIndex: 1, explanation: '涓瓑锛氳法鍥藉叕鍙搞€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€?995骞?鏈?鏃ワ紝涓栫晫璐告槗缁勭粐姝ｅ紡鎴愮珛鈥︹€﹀畠鐨勬垚绔嬭繘涓€姝ヤ績杩涗簡鍏ㄧ悆璐告槗鍜屼笘鐣岀粡娴庣殑鍙戝睍銆傘€嶈繖鍙嶆槧浜?, options: ['鏀挎不澶氭瀬鍖?, '缁忔祹鍏ㄧ悆鍖栬秼鍔?, '鍐锋垬鏍煎眬', '娈栨皯浣撶郴澶嶅叴'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽叏鐞冨寲銆? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級涓栫晫澶氭瀬鍖栬秼鍔跨殑绉瀬褰卞搷鏄?, options: ['缇庡浗鐙湼涓栫晫', '鏈夊埄浜庡墛寮遍湼鏉冧富涔夈€佹帹鍔ㄥ缓绔嬪叕姝ｅ悎鐞嗙殑鍥介檯绉╁簭', '浣夸笘鐣屾洿鍔犲姩鑽?, '娑堥櫎鍥藉闂村樊璺?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽鏋佸寲杩涙鎬с€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闈㈠缁忔祹鍏ㄧ悆鍖栵紝鍙戝睍涓浗瀹跺簲', options: ['闂叧鑷畧', '鎶撲綇鏈洪亣銆佽繋鎺ユ寫鎴樸€佽秼鍒╅伩瀹?, '鎷掔粷涓€鍒囧悎浣?, '瀹屽叏渚濊禆澶у浗'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾纭€佸害銆? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝涓ゆ瀬鏍煎眬涓庡鏋佸寲瓒嬪娍锛屽悗鑰?, options: ['鐢辩編鑻忎袱鍥戒富瀵?, '鐢卞涓姏閲忎腑蹇冨叡鍚屾帹鍔ㄣ€佹洿鏈夊埄浜庡拰骞冲彂灞?, '娑堥櫎浜嗕竴鍒囩煕鐩?, '褰㈡垚浜庣浜屾涓栫晫澶ф垬涓?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾牸灞€婕斿彉銆? },
    ],
  },

  {
    id: 'g-his-9b-21', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗叚鍗曞厓 褰撲唬涓栫晫鐨勪富瑕佸彂灞曡秼鍔?, edition: '缁熺紪鐗?, section: '绗?1璇?鍜屽钩鍙戝睍鍚堜綔鍏辫耽鐨勫巻鍙叉疆娴?,
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?1璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鑱斿悎鍥戒笌浜洪亾涓讳箟', content: '缁存姢鍥介檯鍜屽钩涓庡畨鍏紝瀹夌悊浼氥€? },
      { id: 'kp2', title: '浜虹被闈复鐨勫叡鍚岄棶棰?, content: '闇告潈涓讳箟銆佹亹鎬栦富涔夈€佹皵鍊欍€佽传鍥般€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '褰撲粖鏈€鍏峰奖鍝嶅姏銆佺淮鎶ゅ浗闄呭拰骞充笌瀹夊叏鐨勫浗闄呯粍缁囨槸', options: ['娆х洘', '鑱斿悎鍥?, '鍥介檯鑱旂洘', '涓栫晫璐告槗缁勭粐'], answerIndex: 1, explanation: '绠€鍗曪細鑱斿悎鍥姐€? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鑱斿悎鍥界殑涓昏瀹¤鏈烘瀯鏄?, options: ['瀹夌悊浼?, '鑱斿悎鍥藉ぇ浼?, '绉樹功澶?, '鍥介檯娉曢櫌'], answerIndex: 1, explanation: '绠€鍗曪細鑱斿悎鍥藉ぇ浼氥€? },
      { id: 'q3', knowledgePointId: 'kp1', prompt: '鑱斿悎鍥戒腑鏈夋潈閲囧彇缁村拰琛屽姩鐨勬満鏋勬槸', options: ['鑱斿悎鍥藉ぇ浼?, '瀹夌悊浼?, '绉樹功澶?, '缁忕ぞ鐞嗕簨浼?], answerIndex: 1, explanation: '绠€鍗曪細瀹夌悊浼氥€? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '褰撲粖涓栫晫锛屽▉鑳佸拰骞充笌鍙戝睍鐨勪富瑕佸洜绱犱笉鍖呮嫭', options: ['闇告潈涓讳箟鍜屽己鏉冩斂娌?, '鍜屽钩鍙戝睍鍚堜綔鍏辫耽', '鎭愭€栦富涔?, '鍦板尯鍐茬獊'], answerIndex: 1, explanation: '涓瓑锛氬拰骞冲彂灞曟槸娼祦銆? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '浜虹被闈复鐨勫叏鐞冩€ч棶棰樻槸', options: ['鐜姹℃煋銆佹皵鍊欏彉鍖栥€佽传鍥般€佺柧鐥?, '鍙湁鎴樹簤', '鍙槸璧勬簮鐭己', '浠呭瓨鍦ㄩゥ楗?], answerIndex: 0, explanation: '涓瓑锛氬叏鐞冩€ф寫鎴樸€? },
      { id: 'q6', knowledgePointId: 'kp2', prompt: '搴斿鍏ㄧ悆鎬ч棶棰橈紝闇€瑕佷笘鐣屽悇鍥?, options: ['鍚勮嚜涓烘垬', '鍔犲己鍥介檯鍚堜綔銆佹瀯寤轰汉绫诲懡杩愬叡鍚屼綋', '浠ラ偦涓哄', '鎺ㄨ鍗曡竟涓讳箟'], answerIndex: 1, explanation: '涓瓑锛氬叏鐞冩不鐞嗐€? },
      { id: 'q7', knowledgePointId: 'kp1', prompt: '鏉愭枡锛氥€岃仈鍚堝浗涓嶆槸涓€涓浗瀹讹紝鑰屾槸涓€涓敱涓绘潈鍥藉缁勬垚鐨勫浗闄呯粍缁団€︹€﹀畠鍦ㄧ淮鎶や笘鐣屽拰骞炽€佺紦鍜屽浗闄呯揣寮犲眬鍔挎柟闈㈠彂鎸ョ潃绉瀬浣滅敤銆傘€嶈缁勭粐鏄?, options: ['娆х洘', '鑱斿悎鍥?, '鍥介檯鑱旂洘', '浜氬お缁忓悎缁勭粐'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛岃仈鍚堝浗銆? },
      { id: 'q8', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級闈㈠浜虹被鍏卞悓闂锛屾纭仛娉曟槸', options: ['鎺ㄨ闇告潈', '鏋勫缓浜虹被鍛借繍鍏卞悓浣撱€佸紑灞曞叏鐞冩不鐞?, '閫€缇ら€€绾?, '浠ラ偦涓哄'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽悎浣滃叡璧€? },
      { id: 'q9', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍥介檯鑱旂洘涓庤仈鍚堝浗锛屽叡鍚岀偣鏄?, options: ['閮界敱缇庡浗涓诲', '閮芥槸涓栫晫澶ф垬鍚庡缓绔嬨€佷互缁存姢鍜屽钩涓哄畻鏃?, '閮借В鍐充簡涓€鍒囦簤绔?, '閮芥嫢鏈夊父澶囨瑁呴儴闃?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽浗闄呯粍缁囥€? },
      { id: 'q10', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級鍜屽钩銆佸彂灞曘€佸悎浣溿€佸叡璧㈡垚涓烘椂浠ｆ疆娴侊紝璇存槑', options: ['鎴樹簤宸茶娑堢伃', '鍜屽钩涓庡彂灞曚粛鏄綋浠婃椂浠ｄ富棰?, '闇告潈涓讳箟宸叉秷澶?, '璐瘜宸窛娑堝け'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屾椂浠ｄ富棰樸€? },
    ],
  },

  {
    id: 'g-his-9b-22', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓嬪唽',
    chapter: '绗叚鍗曞厓 褰撲唬涓栫晫鐨勪富瑕佸彂灞曡秼鍔?, edition: '缁熺紪鐗?, section: '绗?2璇?娲诲姩璇?鏃朵簨婧簮',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'textbook_catalog', ref: 'history-9b', locator: '绗?2璇? },
    knowledgePoints: [
      { id: 'kp1', title: '鍘嗗彶瀛︿範鏂规硶', content: '浠庡巻鍙茶搴﹀垎鏋愭椂浜嬶紝浠ュ彶閴翠粖銆? },
      { id: 'kp2', title: '鍥介檯鐑偣婧簮', content: '鍦板尯鍐茬獊銆佺粡璐告懇鎿﹂兘鏈夊巻鍙叉牴婧愩€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'kp1', prompt: '瀛︿範鍘嗗彶鐨勯噸瑕佺洰鐨勬槸', options: ['姝昏骞翠唬', '浠ュ彶閴翠粖銆佽璇嗙幇瀹?, '搴斾粯鑰冭瘯', '鍙鏁呬簨'], answerIndex: 1, explanation: '绠€鍗曪細鍘嗗彶鐓ц繘鐜板疄銆? },
      { id: 'q2', knowledgePointId: 'kp1', prompt: '鍒嗘瀽鍥介檯鏃朵簨鏃讹紝姝ｇ‘鐨勬柟娉曟槸', options: ['鍑洿瑙夊垽鏂?, '杩芥函鍘嗗彶娓婃簮銆佸叏闈㈣京璇佸垎鏋?, '鍙湅琛ㄩ潰鐜拌薄', '鎯呯华鍖栬瘎璁?], answerIndex: 1, explanation: '绠€鍗曪細鍘嗗彶鐪煎厜銆? },
      { id: 'q3', knowledgePointId: 'kp2', prompt: '宸翠互鍐茬獊鐨勫巻鍙叉牴婧愬彲杩芥函鍒?, options: ['绗竴娆′笘鐣屽ぇ鎴?, '浜屾垬鍚庤仈鍚堝浗鍒嗘不鍐宠涓庨樋浠ラ暱鏈熷绔?, '鍐锋垬缁撴潫', '娴锋咕鎴樹簤'], answerIndex: 1, explanation: '绠€鍗曪細涓笢闂澶嶆潅銆? },
      { id: 'q4', knowledgePointId: 'kp2', prompt: '淇勪箤鍐茬獊鍙互鑱旂郴鍒?, options: ['绗簩娆′笘鐣屽ぇ鎴?, '鑻忚仈瑙ｄ綋鍚庣殑鍦扮紭鏀挎不婕斿彉', '绗竴娆′笘鐣屽ぇ鎴?, '鍗佸瓧鍐涗笢寰?], answerIndex: 1, explanation: '涓瓑锛氬巻鍙茬旱娣便€? },
      { id: 'q5', knowledgePointId: 'kp2', prompt: '涓編缁忚锤鎽╂摝锛屼粠鍘嗗彶瑙掑害鐪嬩笌涓嬪垪鍝竴瓒嬪娍鐩稿叧', options: ['娈栨皯浣撶郴澶嶅叴', '缁忔祹鍏ㄧ悆鍖栦笌澶氭瀬鍖栬秼鍔夸笅鐨勫ぇ鍥藉崥寮?, '鍐锋垬閲嶆柊寮€濮?, '闂叧閿佸浗'], answerIndex: 1, explanation: '涓瓑锛氭椂浠ｈ儗鏅€? },
      { id: 'q6', knowledgePointId: 'kp1', prompt: '瀛︿範鏃朵簨婧簮锛屾渶闇€瑕佸煿鍏荤殑鍘嗗彶绱犲吇鏄?, options: ['璁板繂骞翠唬', '鏃剁┖瑙傚康銆佸巻鍙茶В閲娿€佸鍥芥儏鎬€', '鑳岃鏉℃枃', '妯′豢浠栦汉'], answerIndex: 1, explanation: '涓瓑锛氭牳蹇冪礌鍏汇€? },
      { id: 'q7', knowledgePointId: 'kp2', prompt: '鏉愭枡锛氥€屼粖鏃ヤ笘鐣岀殑璁稿鐑偣闂锛岄兘鑳藉湪鍘嗗彶涓壘鍒扮瀛愩€傚彧鏈夎鎳傚巻鍙诧紝鎵嶈兘鐪嬫竻浠婂ぉ鐨勪笘鐣屻€傘€嶈繖鍙ヨ瘽璇存槑', options: ['鍘嗗彶姣棤鐢ㄥ', '鍘嗗彶涓庣幇瀹炵揣瀵嗙浉杩炪€佷互鍙查壌浠?, '鐜板疄涓庡巻鍙叉棤鍏?, '鍘嗗彶鍙杩囧幓'], answerIndex: 1, explanation: '涓瓑锛氭潗鏂欏簲鐢ㄩ锛屽巻鍙茬溂鍏夈€? },
      { id: 'q8', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級瀛︿範鍘嗗彶锛屾垜浠簲鏍戠珛鐨勬纭€佸害鏄?, options: ['鍘嗗彶鏄换浜烘墦鎵殑灏忓濞?, '灏婇噸鍙插疄銆佹眰鐪熸眰瀹炪€佸彜涓轰粖鐢?, '鍘嗗彶娌℃湁瑙勫緥', '鍘嗗彶鍙互闅忔剰姝洸'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽敮鐗╁彶瑙傘€? },
      { id: 'q9', knowledgePointId: 'kp2', prompt: '锛堜腑鑰冪湡棰橈級浠庡巻鍙茶搴﹁璇嗗綋浠婂浗闄呯儹鐐癸紝鏈夊姪浜庢垜浠?, options: ['鐓藉姩姘戞棌瀵圭珛', '鐞嗚В闂鏍规簮銆佺悊鎬х湅寰呭浗闄呬簨鍔?, '瀹ｆ壃闇告潈閫昏緫', '鍒堕€犳枃鏄庡啿绐?], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛岀悊鎬у弬涓庛€? },
      { id: 'q10', knowledgePointId: 'kp1', prompt: '锛堜腑鑰冪湡棰橈級姣旇緝鍘嗗彶涓庣幇瀹烇紝姝ｇ‘鐨勮璇嗘槸', options: ['鍘嗗彶涓庣幇瀹炲畬鍏ㄥ壊瑁?, '鐜板疄鏄巻鍙茬殑寤剁画銆佸巻鍙叉槸鐜板疄鐨勯暅瀛?, '鐜板疄涓庡巻鍙茬畝鍗曢噸澶?, '鍘嗗彶宸茬粡姣棤鐢ㄥ'], answerIndex: 1, explanation: '鐪熼锛氭潗鏂欏簲鐢ㄩ锛屽彜浠婅疮閫氥€? },
    ],
  },

  // ---- geography.fragment.ts ----
  {
    id: 'hist-7a-1-1', grade: '鍒濅竴', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 鍙插墠鏃舵湡', edition: '浜烘暀鐗?, section: '1. 涓浗澧冨唴鏃╂湡浜虹被',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'hist7a', locator: 'p1' },
    knowledgePoints: [
      { id: 'yuanmou', title: '鍏冭皨浜?, content: '璺濅粖绾?70涓囧勾锛屾垜鍥藉鍐呯洰鍓嶅凡纭鐨勬渶鏃╁彜浜虹被銆? },
      { id: 'beijing', title: '鍖椾含浜?, content: '璺濅粖绾?0-20涓囧勾锛屼細浣跨敤澶╃劧鐏紝淇濈暀鐚跨殑鏌愪簺鐗瑰緛銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'yuanmou', prompt: '鎴戝浗澧冨唴鐩墠宸茬‘璁ょ殑鏈€鏃╁彜浜虹被鏄紵', options: ['鍖椾含浜?, '鍏冭皨浜?, '灞遍《娲炰汉', '鍗婂潯浜?], answerIndex: 1, explanation: '鍏冭皨浜鸿窛浠婄害170涓囧勾銆? },
      { id: 'q2', knowledgePointId: 'beijing', prompt: '鍖椾含浜轰細浣跨敤锛?, options: ['浜哄伐鍙栫伀', '澶╃劧鐏?, '閽绘湪鍙栫伀', '鐏煷'], answerIndex: 1, explanation: '鍖椾含浜轰細浣跨敤澶╃劧鐏紝淇濆瓨鐏銆? },
      { id: 'q3', knowledgePointId: 'beijing', prompt: '鍖椾含浜虹敓娲昏窛浠婄害澶氬皯骞达紵', options: ['170涓囧勾', '70-20涓囧勾', '7000骞?, '5000骞?], answerIndex: 1, explanation: '鍖椾含浜鸿窛浠婄害70-20涓囧勾銆? },
      { id: 'q4', knowledgePointId: 'yuanmou', prompt: '鍏冭皨浜哄彂鐜颁簬鍝釜鐪侊紵', options: ['鍖椾含', '浜戝崡', '闄曡タ', '娴欐睙'], answerIndex: 1, explanation: '鍏冭皨浜哄彂鐜颁簬浜戝崡鍏冭皨鍘裤€? },
    ],
  },

  // --- 鍦扮悊 ---
  {
    id: 'hist-8a-1-1', grade: '鍒濅簩', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '绗竴鍗曞厓 渚电暐涓庡弽鎶?, edition: '浜烘暀鐗?, section: '1. 楦︾墖鎴樹簤',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'hist8a', locator: 'p1' },
    knowledgePoints: [
      { id: 'cause', title: '楦︾墖鎴樹簤鍘熷洜', content: '鑻卞浗涓轰簡鎵撳紑涓浗甯傚満锛屾帹閿€宸ヤ笟鍝侊紝鎺犲ず鍘熸枡銆? },
      { id: 'treaty', title: '銆婂崡浜潯绾︺€?, content: '1842骞寸璁紝鍓查娓矝缁欒嫳鍥斤紝璧旀2100涓囬摱鍏冿紝寮€鏀句簲鍙ｉ€氬晢銆? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'cause', prompt: '楦︾墖鎴樹簤鐖嗗彂浜庡摢涓€骞达紵', options: ['1840骞?, '1842骞?, '1856骞?, '1860骞?], answerIndex: 0, explanation: '1840骞撮甫鐗囨垬浜夌垎鍙戙€? },
      { id: 'q2', knowledgePointId: 'treaty', prompt: '涓浗杩戜唬鍙蹭笂绗竴涓笉骞崇瓑鏉＄害鏄紵', options: ['銆婂崡浜潯绾︺€?, '銆婇┈鍏虫潯绾︺€?, '銆婅緵涓戞潯绾︺€?, '銆婂寳浜潯绾︺€?], answerIndex: 0, explanation: '銆婂崡浜潯绾︺€?842骞寸璁€? },
      { id: 'q3', knowledgePointId: 'treaty', prompt: '銆婂崡浜潯绾︺€嬪壊璁╁摢閲岀粰鑻卞浗锛?, options: ['鍙版咕', '棣欐腐宀?, '涔濋緳', '婢抽棬'], answerIndex: 1, explanation: '鍓查娓矝锛屼笉鏄暣涓娓€? },
      { id: 'q4', knowledgePointId: 'cause', prompt: '楦︾墖鎴樹簤鐖嗗彂鐨勬牴鏈師鍥犳槸锛?, options: ['铏庨棬閿€鐑?, '鑻卞浗瑕佹墦寮€涓浗甯傚満', '涓浗闂叧閿佸浗', '鑻卞浗鎯冲悶骞朵腑鍥?], answerIndex: 1, explanation: '鏍规湰鍘熷洜鏄嫳鍥借鎵撳紑涓浗甯傚満銆? },
    ],
  },
  {
    id: 'hist-9a-1-1', grade: '鍒濅笁', subject: '鍘嗗彶', volume: '涓婂唽',
    chapter: '涓栫晫鍙や唬鍙?, edition: '浜烘暀鐗?, section: '1. 鍙や唬鍩冨強',
    sourceNote: '鐗у摬瀛﹀爞鍘熷垱缁冧範銆?, catalogEvidence: { kind: 'local_pdf_sha256', ref: 'hist9a', locator: 'p1' },
    knowledgePoints: [
      { id: 'pyramid', title: '閲戝瓧濉?, content: '鍙ゅ焹鍙婃硶鑰佺殑闄靛锛屾槸鍙ゅ焹鍙婃枃鏄庣殑璞″緛銆? },
      { id: 'nile', title: '灏肩綏娌?, content: '鍙ゅ焹鍙婃枃鏄庡彂婧愪簬灏肩綏娌虫祦鍩熴€? },
    ],
    questions: [
      { id: 'q1', knowledgePointId: 'pyramid', prompt: '閲戝瓧濉旀槸鍙ゅ焹鍙婁粈涔堜汉鐨勯櫟澧擄紵', options: ['骞虫皯', '娉曡€?, '璐垫棌', '濂撮毝'], answerIndex: 1, explanation: '閲戝瓧濉旀槸娉曡€佺殑闄靛銆? },
      { id: 'q2', knowledgePointId: 'nile', prompt: '鍙ゅ焹鍙婃枃鏄庡彂婧愪簬鍝潯娌虫祦锛?, options: ['涓ゆ渤娴佸煙', '榛勬渤', '灏肩綏娌?, '鍗板害娌?], answerIndex: 2, explanation: '灏肩綏娌虫槸鍙ゅ焹鍙婄殑姣嶄翰娌炽€? },
      { id: 'q3', knowledgePointId: 'pyramid', prompt: '閲戝瓧濉旀槸鍝釜鏂囨槑鐨勮薄寰侊紵', options: ['鍙ゅ嵃搴?, '鍙ゅ焹鍙?, '鍙ゅ反姣斾鸡', '鍙や唬涓浗'], answerIndex: 1, explanation: '閲戝瓧濉旀槸鍙ゅ焹鍙婃枃鏄庣殑璞″緛銆? },
      { id: 'q4', knowledgePointId: 'nile', prompt: '鍥涘ぇ鏂囨槑鍙ゅ浗涓嶅寘鎷紵', options: ['鍙ゅ焹鍙?, '鍙ゅ反姣斾鸡', '鍙ゅ嵃搴?, '鍙ゅ笇鑵?], answerIndex: 3, explanation: '鍥涘ぇ鏂囨槑鍙ゅ浗鏄彜鍩冨強銆佸彜宸存瘮浼︺€佸彜鍗板害銆佸彜浠ｄ腑鍥姐€? },
    ],
  },
  ];
