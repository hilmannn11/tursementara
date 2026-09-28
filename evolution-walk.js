(() => {
  const journey = document.querySelector('#evolutionJourney');
  if (!journey) return;
  const chooser = document.querySelector('#siteChooser');
  const stage = journey.querySelector('.evolution-stage');
  const canvas = journey.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const source = new Image();
  const TAU = Math.PI * 2;
  const period = 1.08;
  const stance = .62;
  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];

  // Masks isolate the original ink for each body and limb, with shared bind-pose joints.
  const figures = [
    {
      hip: [174,573],
      body: [[50,240],[415,240],[415,392],[321,394],[294,430],[269,483],[243,528],[218,566],[188,599],[112,609],[72,558],[67,492],[106,424]],
      legs: [
        { points: [[153,575],[123,665],[77,744],[122,763]], mask: [[112,550],[169,557],[190,591],[178,638],[150,688],[113,738],[122,746],[148,754],[153,771],[122,780],[81,773],[51,759],[43,743],[65,697],[88,648],[111,609]] },
        { points: [[187,570],[207,656],[207,747],[256,764]], mask: [[151,562],[208,550],[237,598],[239,645],[231,699],[235,737],[257,747],[285,752],[296,766],[275,780],[221,783],[187,769],[176,747],[178,699],[160,642]] }
      ],
      arms: [
        { points: [[246,404],[278,536],[317,658],[320,698]], mask: [[227,372],[268,377],[286,416],[287,456],[306,511],[322,552],[337,597],[351,647],[355,683],[343,710],[316,726],[290,713],[285,691],[292,663],[279,625],[260,580],[246,544],[231,515],[226,467],[211,419]] }
      ]
    },
    {
      hip: [585,536],
      garment: [546,463,64,103,630,489,65,97],
      body: [[484,150],[774,150],[774,290],[683,294],[676,336],[671,382],[661,416],[670,446],[684,501],[695,555],[656,581],[612,567],[573,585],[533,575],[493,594],[489,538],[502,479],[512,438],[500,410]],
      legs: [
        { points: [[548,562],[529,658],[496,744],[548,764]], mask: [[514,541],[573,546],[589,589],[570,637],[551,693],[528,737],[543,746],[579,754],[591,768],[562,780],[510,780],[479,765],[466,748],[479,700],[498,652],[508,596]] },
        { points: [[634,560],[651,653],[657,743],[710,765]], mask: [[604,542],[665,537],[685,587],[682,633],[683,685],[684,733],[706,746],[743,754],[759,767],[732,782],[684,782],[648,770],[629,750],[628,699],[614,653],[605,603]] }
      ],
      arms: [
        { points: [[607,314],[605,424],[642,520],[662,563]], mask: [[580,284],[629,278],[655,304],[653,352],[637,401],[638,426],[653,469],[679,518],[694,550],[692,578],[675,595],[648,588],[633,573],[629,547],[611,508],[593,470],[573,432],[565,399],[568,353]] },
        { points: [[668,335],[694,432],[722,505],[730,551]], mask: [[649,323],[681,321],[692,370],[707,410],[716,440],[739,480],[756,519],[760,550],[747,571],[724,577],[707,563],[711,532],[699,506],[681,471],[669,437],[659,394]] }
      ]
    },
    {
      hip: [972,517],
      garment: [987,461,58,82,921,475,59,82],
      body: [[871,94],[1084,94],[1084,248],[1029,254],[1040,309],[1042,361],[1037,403],[1042,446],[1052,488],[1064,540],[1023,554],[990,545],[953,558],[917,550],[878,558],[885,509],[892,459],[892,411],[892,353]],
      legs: [
        { points: [[929,546],[913,646],[887,744],[939,765]], mask: [[897,532],[951,536],[972,576],[948,623],[939,671],[918,735],[930,746],[963,754],[980,769],[951,781],[902,780],[870,768],[858,748],[872,704],[883,660],[886,611]] },
        { points: [[1007,547],[1027,643],[1044,744],[1096,765]], mask: [[977,532],[1038,529],[1056,566],[1057,612],[1056,657],[1065,704],[1069,735],[1098,749],[1124,753],[1138,768],[1112,782],[1068,782],[1033,773],[1014,753],[1013,709],[997,661],[986,614]] }
      ],
      arms: [
        { points: [[931,292],[916,394],[942,488],[950,529]], mask: [[907,263],[955,262],[975,290],[969,328],[946,374],[943,400],[953,447],[973,488],[980,523],[971,549],[949,558],[928,548],[923,523],[919,491],[904,452],[889,414],[879,387],[883,342],[891,298]] },
        { points: [[1026,310],[1055,416],[1085,477],[1094,515]], mask: [[1017,296],[1041,298],[1050,350],[1060,391],[1081,430],[1105,469],[1116,498],[1114,523],[1100,537],[1078,535],[1067,520],[1074,495],[1061,470],[1046,450],[1037,420],[1024,383]] }
      ]
    },
    {
      hip: [1360,514],
      garment: [1367,457,61,81,1299,469,63,80],
      body: [[1268,49],[1464,49],[1464,218],[1406,223],[1427,270],[1432,323],[1435,369],[1431,409],[1440,460],[1453,533],[1414,551],[1370,545],[1337,558],[1304,546],[1266,550],[1275,495],[1287,446],[1287,397],[1275,346]],
      legs: [
        { points: [[1315,545],[1298,641],[1275,744],[1326,765]], mask: [[1282,529],[1340,533],[1357,575],[1332,622],[1324,668],[1302,735],[1315,747],[1351,754],[1374,769],[1348,782],[1299,783],[1262,773],[1245,752],[1257,709],[1268,659],[1269,612]] },
        { points: [[1399,545],[1420,640],[1437,744],[1491,765]], mask: [[1366,532],[1426,531],[1441,569],[1446,613],[1446,660],[1459,708],[1464,737],[1490,748],[1518,754],[1539,770],[1515,783],[1461,783],[1426,773],[1408,752],[1404,710],[1388,661],[1375,616]] }
      ],
      arms: [
        { points: [[1321,270],[1305,379],[1324,477],[1330,517]], mask: [[1292,239],[1343,239],[1363,266],[1358,305],[1333,354],[1334,391],[1340,439],[1356,484],[1358,515],[1347,537],[1323,544],[1303,531],[1299,505],[1299,477],[1283,432],[1271,393],[1264,356],[1269,310],[1276,269]] },
        { points: [[1415,275],[1433,379],[1477,458],[1485,498]], mask: [[1398,262],[1428,265],[1440,311],[1447,347],[1456,383],[1480,425],[1508,459],[1519,488],[1515,511],[1494,531],[1476,529],[1465,513],[1470,488],[1452,459],[1434,435],[1418,402],[1407,365]] }
      ]
    },
    {
      hip: [1763,510],
      garment: [1762,430,64,85,1686,441,64,87],
      body: [[1667,14],[1856,14],[1856,180],[1805,187],[1827,232],[1833,286],[1837,338],[1834,382],[1841,432],[1856,515],[1818,534],[1776,533],[1740,552],[1703,532],[1670,533],[1678,482],[1692,427],[1691,371],[1675,307]],
      legs: [
        { points: [[1711,541],[1688,637],[1669,743],[1720,765]], mask: [[1685,523],[1739,529],[1754,573],[1730,616],[1716,665],[1696,733],[1706,747],[1740,754],[1765,770],[1743,782],[1690,783],[1657,773],[1641,752],[1652,709],[1662,658],[1666,608]] },
        { points: [[1797,540],[1810,636],[1830,743],[1883,765]], mask: [[1768,530],[1828,520],[1843,562],[1841,610],[1840,653],[1854,703],[1856,734],[1883,748],[1914,754],[1927,769],[1907,783],[1851,783],[1818,775],[1798,755],[1796,710],[1780,662],[1768,611]] }
      ],
      arms: [
        { points: [[1715,231],[1691,348],[1710,450],[1715,492]], mask: [[1690,202],[1739,203],[1758,228],[1753,271],[1726,324],[1722,351],[1731,405],[1744,449],[1746,489],[1736,510],[1715,519],[1690,509],[1688,481],[1688,455],[1672,407],[1664,367],[1663,329],[1669,282],[1673,237]] },
        { points: [[1815,264],[1831,369],[1872,443],[1882,482]], mask: [[1801,249],[1831,250],[1838,292],[1847,338],[1858,373],[1882,410],[1904,444],[1913,473],[1908,497],[1890,513],[1868,510],[1857,493],[1866,471],[1847,443],[1829,419],[1814,384],[1802,342]] }
      ]
    }
  ];

  let rigs = [];
  let current = 0;
  let phase = 0;
  let worldX = 90;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let scale = .26;
  let visible = false;
  let paused = false;
  let frame = 0;
  let previousTime = 0;

  function polygonPath(ctx, polygon) {
    ctx.beginPath();
    polygon.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  }

  function texture(polygon, planes = [], garment) {
    const x = Math.floor(Math.min(...polygon.map(p => p[0])));
    const y = Math.floor(Math.min(...polygon.map(p => p[1])));
    const image = document.createElement('canvas');
    image.width = Math.ceil(Math.max(...polygon.map(p => p[0]))) - x + 1;
    image.height = Math.ceil(Math.max(...polygon.map(p => p[1]))) - y + 1;
    const ctx = image.getContext('2d');
    ctx.translate(-x, -y);
    polygonPath(ctx, polygon);
    ctx.clip();
    planes.forEach(({ at, direction, side }) => {
      const length = Math.hypot(...direction);
      const normal = direction.map(n => n / length * side);
      const tangent = [-normal[1], normal[0]];
      const origin = [at[0] - normal[0] * 12, at[1] - normal[1] * 12];
      polygonPath(ctx, [
        add(origin, tangent.map(n => n * 2500)),
        add(add(origin, tangent.map(n => n * 2500)), normal.map(n => n * 2500)),
        add(add(origin, tangent.map(n => -n * 2500)), normal.map(n => n * 2500)),
        add(origin, tangent.map(n => -n * 2500))
      ]);
      ctx.clip();
    });
    ctx.drawImage(source, 0, 0);
    // Continue the tunic beneath the detached hand so it is not drawn twice.
    if (garment) ctx.drawImage(source, ...garment);
    return { image, x, y };
  }

  function makeLimb(limb) {
    const { points, mask } = limb;
    const parts = points.slice(0, -1).map((point, i) => {
      const planes = [];
      if (i) planes.push({ at: point, direction: subtract(points[i + 1], points[i - 1]), side: 1 });
      if (i < points.length - 2) planes.push({ at: points[i + 1], direction: subtract(points[i + 2], point), side: -1 });
      return texture(mask, planes);
    });
    return { ...limb, parts, lengths: points.slice(1).map((p, i) => distance(points[i], p)) };
  }

  function drawBone(part, from, to, targetFrom, targetTo) {
    const stretch = distance(targetFrom, targetTo) / distance(from, to);
    context.save();
    context.translate(...targetFrom);
    context.rotate(angle(targetFrom, targetTo) - angle(from, to));
    context.scale(stretch, stretch);
    context.drawImage(part.image, part.x - from[0], part.y - from[1]);
    context.restore();
  }

  function drawLimb(limb, points) {
    limb.parts.forEach((part, i) => drawBone(part, limb.points[i], limb.points[i + 1], points[i], points[i + 1]));
  }

  function kneePosition(hip, foot, upper, lower) {
    const reach = Math.min(distance(hip, foot), upper + lower - .1);
    const bend = Math.acos(Math.max(-1, Math.min(1, (upper * upper + reach * reach - lower * lower) / (2 * upper * reach))));
    const direction = angle(hip, foot) - bend;
    return [hip[0] + Math.cos(direction) * upper, hip[1] + Math.sin(direction) * upper];
  }

  function legPose(rig, limb, offset, bob, stride) {
    const cycle = (phase + offset) % 1;
    const swing = Math.max(0, (cycle - stance) / (1 - stance));
    const swingCurve = 3 * swing ** 2 - 2 * swing ** 3;
    const tangent = -(1 - stance) / stance;
    const swingTravel = swingCurve + tangent * (2 * swing ** 3 - 3 * swing ** 2 + swing);
    const x = cycle < stance ? stride * (.5 - cycle / stance) : stride * (-.5 + swingTravel);
    const lift = Math.sin(Math.PI * swing) ** 2 * 45;
    const hip = [0, -rig.reach + bob];
    const ankle = [x, -20 - lift];
    const knee = kneePosition(hip, ankle, limb.lengths[0], limb.lengths[1]);
    const toeTilt = cycle < stance ? Math.max(0, cycle / stance - .78) * 1.1 : -.15 * Math.sin(Math.PI * swing);
    const footAngle = angle(limb.points[2], limb.points[3]) + toeTilt;
    const toe = [ankle[0] + limb.lengths[2] * Math.cos(footAngle), ankle[1] + limb.lengths[2] * Math.sin(footAngle)];
    return [hip, knee, ankle, toe];
  }

  function armPose(rig, limb, offset, bodyOffset) {
    const shoulder = add(subtract(limb.points[0], rig.hip), bodyOffset);
    const swing = Math.sin((phase + offset) * TAU) * .38;
    const upperAngle = Math.PI / 2 + swing;
    const forearmAngle = upperAngle - .25 - .12 * Math.cos((phase + offset) * TAU);
    const elbow = add(shoulder, [Math.cos(upperAngle) * limb.lengths[0], Math.sin(upperAngle) * limb.lengths[0]]);
    const wrist = add(elbow, [Math.cos(forearmAngle) * limb.lengths[1], Math.sin(forearmAngle) * limb.lengths[1]]);
    const hand = add(wrist, [Math.cos(forearmAngle) * limb.lengths[2], Math.sin(forearmAngle) * limb.lengths[2]]);
    return [shoulder, elbow, wrist, hand];
  }

  function draw() {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const rig = rigs[current];
    if (!rig || !width) return;
    const bob = Math.cos(phase * TAU * 2) * 3.5;
    const bodyOffset = [0, -rig.reach + bob];
    const stride = rig.reach * .82;
    context.save();
    context.translate(motion.matches ? width / 2 : worldX, height - 18);
    context.scale(scale, scale);
    const rearArm = rig.arms[1] || rig.arms[0];
    drawLimb(rearArm, armPose(rig, rearArm, .5, bodyOffset));
    drawLimb(rig.legs[0], legPose(rig, rig.legs[0], .5, bob, stride));
    drawLimb(rig.legs[1], legPose(rig, rig.legs[1], 0, bob, stride));
    context.drawImage(rig.core.image, rig.core.x - rig.hip[0], rig.core.y - rig.hip[1] + bodyOffset[1]);
    drawLimb(rig.arms[0], armPose(rig, rig.arms[0], 0, bodyOffset));
    context.restore();
    context.save();
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = 'rgba(23, 75, 72, .82)';
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  const canRun = () => rigs.length && visible && !chooser.hidden && !chooser.closest('[hidden]') && !document.hidden && !motion.matches && !paused;

  function tick(time) {
    frame = 0;
    if (!canRun()) return;
    const elapsed = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time;
    const rig = rigs[current];
    phase = (phase + elapsed / period) % 1;
    // Match body travel to the planted foot's backward motion to prevent skating.
    worldX += elapsed * (rig.reach * .82 / (period * stance)) * scale;
    if (worldX > width + 160 * scale) {
      current = (current + 1) % rigs.length;
      worldX = -160 * scale;
      phase = 0;
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    const running = Boolean(canRun());
    journey.classList.toggle('is-running', running);
    stage.setAttribute('aria-pressed', String(paused));
    stage.setAttribute('aria-label', motion.matches ? 'Ilustrasi figur evolusi manusia' : paused ? 'Putar animasi figur berjalan' : 'Jeda animasi figur berjalan');
    stage.disabled = motion.matches;
    draw();
    if (running) frame = requestAnimationFrame(tick);
  }

  function resize() {
    if (!stage.clientWidth || !stage.clientHeight) return;
    const oldWidth = width;
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (!width || !height) return;
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    scale = (height - 34) / 760;
    if (oldWidth) worldX *= width / oldWidth;
    else worldX = Math.min(90, width * .25);
    draw();
  }

  stage.addEventListener('click', () => { paused = !paused; sync(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .12 }).observe(stage);
  new ResizeObserver(resize).observe(stage);
  new MutationObserver(sync).observe(chooser, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  source.addEventListener('load', () => {
    rigs = figures.map(figure => {
      const legs = figure.legs.map(makeLimb);
      return { ...figure, core: texture(figure.body, [], figure.garment), legs, arms: figure.arms.map(makeLimb), reach: Math.min(...legs.map(leg => leg.lengths[0] + leg.lengths[1])) * .89 + 20 };
    });
    resize();
    sync();
  }, { once: true });
  source.src = './assets/evolution-walk-source.png';
})();
