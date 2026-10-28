Add-Type -AssemblyName System.Drawing

$OutDir = "D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\images\practice"
$F  = New-Object System.Drawing.Font('Microsoft YaHei', 34, [System.Drawing.FontStyle]::Bold)
$FL = New-Object System.Drawing.Font('Microsoft YaHei', 40, [System.Drawing.FontStyle]::Bold)
$FR = New-Object System.Drawing.Font('Microsoft YaHei', 56, [System.Drawing.FontStyle]::Bold)
$FS = New-Object System.Drawing.Font('Microsoft YaHei', 30, [System.Drawing.FontStyle]::Bold)
$Pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50,70,90), 7)
$PenR = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(226,75,74), 7)
$PenDash = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120,140,160), 5)
$PenDash.DashStyle = 'Dash'
$PenGrid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(214,210,200), 2)
$Brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40,60,80))
$BrushR = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(226,75,74))

function New-Canvas([int]$w,[int]$h) {
  $bmp = New-Object System.Drawing.Bitmap($w,$h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::FromArgb(252,250,245))
  return @($bmp,$g)
}

function Save-Fig($pair,[string]$name) {
  $pair[1].Dispose()
  $pair[0].Save("$OutDir\$name.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $pair[0].Dispose()
  Write-Output "saved $name"
}

function Draw-Axis($g,[int]$ox,[int]$oy,[int]$x1,[int]$x2,[int]$y1,[int]$y2) {
  $g.DrawLine($Pen, $x1,$oy, $x2,$oy)
  $g.DrawLine($Pen, $ox,$y1, $ox,$y2)
  # 箭头
  $g.DrawLine($Pen, $x2-18,$oy-8, $x2,$oy); $g.DrawLine($Pen, $x2-18,$oy+8, $x2,$oy)
  $g.DrawLine($Pen, $ox-8,$y1+18, $ox,$y1); $g.DrawLine($Pen, $ox+8,$y1+18, $ox,$y1)
  $g.DrawString('x', $FS, $Brush, $x2-34, $oy+6)
  $g.DrawString('y', $FS, $Brush, $ox+8, $y1-40)
}

# ============ 1. 平行线+角平分线（7B 5.3）============
function Draw-ParallelEg([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # AB∥CD：A(90,150) B(560,150) C(90,410) D(560,410)；EF：E(430,150)->F(160,410)
  $g.DrawLine($Pen, 90,150, 560,150)
  $g.DrawLine($Pen, 90,410, 560,410)
  $g.DrawLine($Pen, 430,150, 160,410)
  # EG（角平分线）：E->G(300,330)
  $g.DrawLine($Pen, 430,150, 300,330)
  # ∠1=58° 弧（E 左上方 AB 上方）
  $g.DrawArc($Pen, 360,80,70,70, 25, 70)
  $g.DrawString('1=58' + [char]0x00B0, $FL, $Brush, 330, 40)
  $g.DrawString('A', $FL, $Brush, 60, 140)
  $g.DrawString('B', $FL, $Brush, 560, 140)
  $g.DrawString('C', $FL, $Brush, 60, 412)
  $g.DrawString('D', $FL, $Brush, 560, 412)
  $g.DrawString('E', $FL, $Brush, 438, 100)
  $g.DrawString('F', $FL, $Brush, 130, 412)
  if ($answer) { $g.DrawString('FEG=61' + [char]0x00B0, $FR, $BrushR, 200, 200) }
  else { $g.DrawString('FEG=?', $FR, $BrushR, 220, 200) }
  return $c
}
$c = Draw-ParallelEg $false; Save-Fig $c 'question-parallel-eg'
$c = Draw-ParallelEg $true;  Save-Fig $c 'answer-parallel-eg'

# ============ 2. 平行线折线（7B 5.3）============
function Draw-ParallelBend([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # AB∥CD：A(90,130) B(560,130) C(90,430) D(560,430)；E(330,280) 中间
  $g.DrawLine($Pen, 90,130, 560,130)
  $g.DrawLine($Pen, 90,430, 560,430)
  $g.DrawLine($Pen, 200,130, 330,280)  # BE
  $g.DrawLine($Pen, 330,280, 460,430)  # EC
  $g.DrawString('A', $FL, $Brush, 60, 120)
  $g.DrawString('B', $FL, $Brush, 560, 120)
  $g.DrawString('C', $FL, $Brush, 60, 432)
  $g.DrawString('D', $FL, $Brush, 560, 432)
  $g.DrawString('E', $FL, $Brush, 316, 270)
  # ∠ABE=115°：B 处（上方，折线 BE 与 AB 夹角）
  $g.DrawArc($Pen, 480,100,70,70, 110, 55)
  $g.DrawString('ABE=115' + [char]0x00B0, $FL, $Brush, 470, 42)
  # ∠DCE=35°：C 处下方
  $g.DrawArc($Pen, 430,370,70,70, 150, 40)
  $g.DrawString('DCE=35' + [char]0x00B0, $FL, $Brush, 470, 430)
  if ($answer) { $g.DrawString('BEC=100' + [char]0x00B0, $FR, $BrushR, 180, 310) }
  else { $g.DrawString('BEC=?', $FR, $BrushR, 200, 310) }
  return $c
}
$c = Draw-ParallelBend $false; Save-Fig $c 'question-parallel-bend'
$c = Draw-ParallelBend $true;  Save-Fig $c 'answer-parallel-bend'

# ============ 3. 坐标系网格三角形（7B 7.2）============
function Draw-CoordTriangle([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # 原点 (140,420)，间距 48；A(2,1) B(5,1) C(2,4)
  $ox=140; $oy=420; $s=48
  for ($i=1; $i -le 9; $i++) { $g.DrawLine($PenGrid, $ox+$i*$s, 60, $ox+$i*$s, $oy) }
  for ($j=1; $j -le 6; $j++) { $g.DrawLine($PenGrid, $ox, $oy-$j*$s, 600, $oy-$j*$s) }
  Draw-Axis $g $ox $oy 90 600 50 440
  $ax=$ox+2*$s; $ay=$oy-1*$s; $bx=$ox+5*$s; $by=$ay; $cx=$ax; $cy=$oy-4*$s
  $g.DrawLine($Pen, $ax,$ay, $bx,$by)
  $g.DrawLine($Pen, $ax,$ay, $cx,$cy)
  $g.DrawLine($Pen, $bx,$by, $cx,$cy)
  $g.FillEllipse($Brush, $ax-5,$ay-5,10,10)
  $g.FillEllipse($Brush, $bx-5,$by-5,10,10)
  $g.FillEllipse($Brush, $cx-5,$cy-5,10,10)
  $g.DrawString('A(2,1)', $FS, $Brush, $ax-100, $ay+10)
  $g.DrawString('B(5,1)', $FS, $Brush, $bx-20, $by+10)
  $g.DrawString('C(2,4)', $FS, $Brush, $cx-130, $cy-46)
  if ($answer) { $g.DrawString('面积=4.5', $FR, $BrushR, 320, 280) }
  else { $g.DrawString('面积=?', $FR, $BrushR, 340, 280) }
  return $c
}
$c = Draw-CoordTriangle $false; Save-Fig $c 'question-coord-triangle'
$c = Draw-CoordTriangle $true;  Save-Fig $c 'answer-coord-triangle'

# ============ 4. 坐标系象限点（7B 7.2）============
function Draw-CoordPoint([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  $ox=320; $oy=250; $s=48
  for ($i=-5; $i -le 5; $i++) { if ($i -eq 0) {continue}; $g.DrawLine($PenGrid, $ox+$i*$s, 40, $ox+$i*$s, 460); $g.DrawLine($PenGrid, 40, $oy+$i*$s, 600, $oy+$i*$s) }
  Draw-Axis $g $ox $oy 40 600 40 460
  $px=$ox-4*$s; $py=$oy-3*$s
  $g.FillEllipse($Brush, $px-6,$py-6,12,12)
  $g.DrawString('P', $FL, $Brush, $px-56, $py-54)
  # 距离虚线
  $g.DrawLine($PenDash, $px,$py, $ox,$py)
  $g.DrawLine($PenDash, $px,$py, $px,$oy)
  $g.DrawString('3', $FS, $Brush, $px+8, ($py+$oy)/2-6)
  $g.DrawString('4', $FS, $Brush, ($px+$ox)/2-8, $py+8)
  if ($answer) { $g.DrawString('P(-4,3)', $FR, $BrushR, 400, 120) }
  else { $g.DrawString('P(?,?)', $FR, $BrushR, 420, 120) }
  return $c
}
$c = Draw-CoordPoint $false; Save-Fig $c 'question-coord-point'
$c = Draw-CoordPoint $true;  Save-Fig $c 'answer-coord-point'

# ============ 5. 等腰三角形腰上高（8A 16.2）============
function Draw-IsoscelesHeight([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # A(320,90) B(150,410) C(490,410)；BD⊥AC，D 在 AC 上
  $g.DrawLine($Pen, 320,90, 150,410)
  $g.DrawLine($Pen, 320,90, 490,410)
  $g.DrawLine($Pen, 150,410, 490,410)
  # AC 上 D：约 (405,250)；BD 从 B(150,410) 到 D(405,250)
  $g.DrawLine($Pen, 150,410, 405,250)
  # 直角符号 D
  $dx=405; $dy=250
  $g.DrawLine($Pen, $dx-18,$dy, $dx-18,$dy-18); $g.DrawLine($Pen, $dx-18,$dy-18, $dx,$dy-18)
  $g.DrawString('A', $FL, $Brush, 330, 48)
  $g.DrawString('B', $FL, $Brush, 116, 414)
  $g.DrawString('C', $FL, $Brush, 490, 414)
  $g.DrawString('D', $FL, $Brush, 412, 250)
  # ∠A=40°
  $g.DrawArc($Pen, 300,60,90,90, 20, 55)
  $g.DrawString('A=40' + [char]0x00B0, $FL, $Brush, 380, 30)
  if ($answer) { $g.DrawString('ABD=50' + [char]0x00B0, $FR, $BrushR, 180, 150) }
  else { $g.DrawString('ABD=?', $FR, $BrushR, 200, 150) }
  return $c
}
$c = Draw-IsoscelesHeight $false; Save-Fig $c 'question-isosceles-height'
$c = Draw-IsoscelesHeight $true;  Save-Fig $c 'answer-isosceles-height'

# ============ 6. 等腰三角形角平分线（8A 16.2）============
function Draw-IsoscelesBd([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # A(320,70) B(130,420) C(510,420)；BD 平分 ∠ABC 交 AC 于 D(400,230)
  $g.DrawLine($Pen, 320,70, 130,420)
  $g.DrawLine($Pen, 320,70, 510,420)
  $g.DrawLine($Pen, 130,420, 510,420)
  $g.DrawLine($Pen, 130,420, 400,230)
  $g.DrawString('A', $FL, $Brush, 330, 26)
  $g.DrawString('B', $FL, $Brush, 96, 424)
  $g.DrawString('C', $FL, $Brush, 510, 424)
  $g.DrawString('D', $FL, $Brush, 408, 230)
  # ∠BAC=100°
  $g.DrawArc($Pen, 300,40,80,80, 18, 50)
  $g.DrawString('A=100' + [char]0x00B0, $FL, $Brush, 390, 10)
  if ($answer) { $g.DrawString('BDC=120' + [char]0x00B0, $FR, $BrushR, 160, 290) }
  else { $g.DrawString('BDC=?', $FR, $BrushR, 180, 290) }
  return $c
}
$c = Draw-IsoscelesBd $false; Save-Fig $c 'question-isosceles-bd'
$c = Draw-IsoscelesBd $true;  Save-Fig $c 'answer-isosceles-bd'

# ============ 7. 平行四边形对角线（8B 22.2）============
function Draw-ParallelogramAc([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # A(110,140) B(520,140) C(450,410) D(40,410)
  $g.DrawLine($Pen, 110,140, 520,140)
  $g.DrawLine($Pen, 520,140, 450,410)
  $g.DrawLine($Pen, 450,410, 40,410)
  $g.DrawLine($Pen, 40,410, 110,140)
  # 对角线 AC、BD 交 O
  $g.DrawLine($PenDash, 110,140, 450,410)
  $g.DrawLine($PenDash, 520,140, 40,410)
  $o = @((110+450)/2, (140+410)/2)  # (280,275)
  $g.FillEllipse($Brush, 274,269,12,12)
  $g.DrawString('A', $FL, $Brush, 80, 126)
  $g.DrawString('B', $FL, $Brush, 520, 126)
  $g.DrawString('C', $FL, $Brush, 452, 414)
  $g.DrawString('D', $FL, $Brush, 12, 414)
  $g.DrawString('O', $FL, $Brush, 262, 268)
  $g.DrawString('AC=10', $FS, $Brush, 150, 240)
  $g.DrawString('BD=6', $FS, $Brush, 420, 240)
  $g.DrawString('AB=7', $FS, $Brush, 300, 120)
  if ($answer) { $g.DrawString('AOB周长=15', $FR, $BrushR, 120, 330) }
  else { $g.DrawString('AOB周长=?', $FR, $BrushR, 100, 330) }
  return $c
}
$c = Draw-ParallelogramAc $false; Save-Fig $c 'question-parallelogram-ac'
$c = Draw-ParallelogramAc $true;  Save-Fig $c 'answer-parallelogram-ac'

# ============ 8. 平行四边形中点+对角线（8B 22.2）============
function Draw-ParallelogramMid([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # A(110,140) B(520,140) C(450,410) D(40,410)；E 为 BC 中点 (485,275)
  $g.DrawLine($Pen, 110,140, 520,140)
  $g.DrawLine($Pen, 520,140, 450,410)
  $g.DrawLine($Pen, 450,410, 40,410)
  $g.DrawLine($Pen, 40,410, 110,140)
  $g.DrawLine($PenDash, 520,140, 40,410)  # BD
  $g.DrawLine($Pen, 110,140, 485,275)     # AE
  $g.FillEllipse($Brush, 480,270,10,10)
  $g.DrawString('E', $FL, $Brush, 492, 250)
  $g.DrawString('A', $FL, $Brush, 80, 126)
  $g.DrawString('B', $FL, $Brush, 520, 126)
  $g.DrawString('C', $FL, $Brush, 452, 414)
  $g.DrawString('D', $FL, $Brush, 12, 414)
  if ($answer) { $g.DrawString('BF:FD=1:2', $FR, $BrushR, 150, 330) }
  else { $g.DrawString('BF:FD=?', $FR, $BrushR, 170, 330) }
  return $c
}
$c = Draw-ParallelogramMid $false; Save-Fig $c 'question-parallelogram-mid'
$c = Draw-ParallelogramMid $true;  Save-Fig $c 'answer-parallelogram-mid'

# ============ 9. A字相似（9A 27.2）============
function Draw-SimilarAde([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # A(320,70) B(100,420) C(540,420)；D(215,265) E(425,265)；DE∥BC
  $g.DrawLine($Pen, 320,70, 100,420)
  $g.DrawLine($Pen, 320,70, 540,420)
  $g.DrawLine($Pen, 100,420, 540,420)
  $g.DrawLine($Pen, 215,265, 425,265)
  $g.DrawString('A', $FL, $Brush, 330, 26)
  $g.DrawString('B', $FL, $Brush, 66, 424)
  $g.DrawString('C', $FL, $Brush, 540, 424)
  $g.DrawString('D', $FL, $Brush, 190, 262)
  $g.DrawString('E', $FL, $Brush, 432, 262)
  $g.DrawString('AD=2', $FS, $Brush, 180, 150)
  $g.DrawString('DB=3', $FS, $Brush, 100, 330)
  $g.DrawString('AE=3', $FS, $Brush, 430, 150)
  if ($answer) { $g.DrawString('EC=4.5', $FR, $BrushR, 450, 330) }
  else { $g.DrawString('EC=?', $FR, $BrushR, 470, 330) }
  return $c
}
$c = Draw-SimilarAde $false; Save-Fig $c 'question-similar-ade'
$c = Draw-SimilarAde $true;  Save-Fig $c 'answer-similar-ade'

# ============ 10. 直角三角形斜边高（9A 27.2）============
function Draw-SimilarCd([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  # C(150,410) A(430,410) B(150,120)；CD⊥AB，D 在 AB 上
  $g.DrawLine($Pen, 150,410, 430,410)
  $g.DrawLine($Pen, 150,410, 150,120)
  $g.DrawLine($Pen, 150,120, 430,410)
  $g.DrawLine($Pen, 150,410, 310,255)   # CD 高
  # 直角符号 C
  $g.DrawLine($Pen, 150,410, 170,410); $g.DrawLine($Pen, 150,410, 150,390); $g.DrawLine($Pen, 150,390, 170,390); $g.DrawLine($Pen, 170,390, 170,410)
  # 直角符号 D
  $g.DrawLine($Pen, 310,255, 310,275); $g.DrawLine($Pen, 310,255, 290,255); $g.DrawLine($Pen, 290,255, 290,275); $g.DrawLine($Pen, 290,275, 310,275)
  $g.DrawString('A', $FL, $Brush, 434, 414)
  $g.DrawString('B', $FL, $Brush, 122, 96)
  $g.DrawString('C', $FL, $Brush, 116, 414)
  $g.DrawString('D', $FL, $Brush, 316, 250)
  $g.DrawString('AC=3', $FS, $Brush, 260, 440)
  $g.DrawString('BC=4', $FS, $Brush, 40, 260)
  if ($answer) { $g.DrawString('CD=2.4', $FR, $BrushR, 200, 200) }
  else { $g.DrawString('CD=?', $FR, $BrushR, 220, 200) }
  return $c
}
$c = Draw-SimilarCd $false; Save-Fig $c 'question-similar-cd'
$c = Draw-SimilarCd $true;  Save-Fig $c 'answer-similar-cd'

# ============ 11. 直径圆周角（9B 31.3）============
function Draw-CircleDiameter([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  $ox=320; $oy=260; $r=180
  $g.DrawEllipse($Pen, $ox-$r, $oy-$r, 2*$r, 2*$r)
  $g.FillEllipse($Brush, $ox-5,$oy-5,10,10)
  $g.DrawLine($Pen, $ox-$r,$oy, $ox+$r,$oy)   # 直径 AB
  # C 在上半圆
  $cx=$ox-90; $cy=$oy-120
  $g.FillEllipse($Brush, $cx-5,$cy-5,10,10)
  $g.DrawLine($Pen, $cx,$cy, $ox+$r,$oy)
  $g.DrawLine($Pen, $cx,$cy, $ox-$r,$oy)
  $g.DrawString('A', $FL, $Brush, $ox-$r-40, $oy+4)
  $g.DrawString('B', $FL, $Brush, $ox+$r+4, $oy+4)
  $g.DrawString('C', $FL, $Brush, $cx-44, $cy-54)
  $g.DrawString('O', $FS, $Brush, $ox+10, $oy-30)
  # ∠ABC=30°（B 处）
  $g.DrawArc($Pen, $ox+$r-80, $oy-60, 80, 80, 160, 40)
  $g.DrawString('ABC=30' + [char]0x00B0, $FL, $Brush, $ox+$r-140, $oy+40)
  if ($answer) { $g.DrawString('BAC=60' + [char]0x00B0, $FR, $BrushR, 120, 80) }
  else { $g.DrawString('BAC=?', $FR, $BrushR, 140, 80) }
  return $c
}
$c = Draw-CircleDiameter $false; Save-Fig $c 'question-circle-diameter'
$c = Draw-CircleDiameter $true;  Save-Fig $c 'answer-circle-diameter'

# ============ 12. 切线（9B 31.3）============
function Draw-CircleTangent([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  $ox=320; $oy=290; $r=150
  $g.DrawEllipse($Pen, $ox-$r, $oy-$r, 2*$r, 2*$r)
  $g.FillEllipse($Brush, $ox-5,$oy-5,10,10)
  # P 上方 (320,60)，切点 A(214,184) B(426,184)
  $g.FillEllipse($Brush, 314,54,12,12)
  $g.DrawLine($Pen, 320,60, 214,184)
  $g.DrawLine($Pen, 320,60, 426,184)
  $g.DrawLine($PenDash, 214,184, $ox,$oy)  # OA
  $g.DrawLine($PenDash, 426,184, $ox,$oy)  # OB
  $g.DrawString('P', $FL, $Brush, 330, 12)
  $g.DrawString('A', $FL, $Brush, 176, 186)
  $g.DrawString('B', $FL, $Brush, 430, 186)
  $g.DrawString('O', $FS, $Brush, $ox+10, $oy-30)
  # C 在下半弧
  $cx=$ox; $cy=$oy+$r-30
  $g.FillEllipse($Brush, $cx-5,$cy-5,10,10)
  $g.DrawLine($PenDash, $cx,$cy, 214,184)
  $g.DrawLine($PenDash, $cx,$cy, 426,184)
  $g.DrawString('C', $FL, $Brush, $cx+8, $cy+8)
  # ∠APB=60°（P 处）
  $g.DrawArc($Pen, 300,60,70,70, 58, 62)
  $g.DrawString('APB=60' + [char]0x00B0, $FL, $Brush, 380, 30)
  if ($answer) { $g.DrawString('ACB=60' + [char]0x00B0, $FR, $BrushR, 250, 380) }
  else { $g.DrawString('ACB=?', $FR, $BrushR, 270, 380) }
  return $c
}
$c = Draw-CircleTangent $false; Save-Fig $c 'question-circle-tangent'
$c = Draw-CircleTangent $true;  Save-Fig $c 'answer-circle-tangent'

Write-Output 'ALL DONE'
