Add-Type -AssemblyName System.Drawing

$OutDir = "D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\images\practice"
# 大字标注，保证手机端可读（图缩到 300px 显示时仍清晰）
$F  = New-Object System.Drawing.Font('Microsoft YaHei', 34, [System.Drawing.FontStyle]::Bold)
$FL = New-Object System.Drawing.Font('Microsoft YaHei', 40, [System.Drawing.FontStyle]::Bold)
$FR = New-Object System.Drawing.Font('Microsoft YaHei', 56, [System.Drawing.FontStyle]::Bold)
$Pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50,70,90), 7)
$PenR = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(226,75,74), 7)
$PenDash = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50,70,90), 5)
$PenDash.DashStyle = 'Dash'
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

# ============ 图1：勾股正方形面积（q7）——图形铺满画布（居中留边） ============
# C(251,246) A(531,246) B(251,35)；斜边正方形 B(251,35) A(531,246) B'(461,316) A'(742,526)
# 底边正方形 A(531,246) C(251,246) -> y+280；左边正方形 B(251,35) C(251,246) -> x-211
$c = New-Canvas 800 600; $g = $c[1]
$g.TranslateTransform(9, 27) # 图形 x40-742 y20-526 -> 居中且四边留 ~47px
$g.DrawLine($Pen, 251,246, 531,246)
$g.DrawLine($Pen, 251,246, 251,35)
$g.DrawLine($Pen, 251,35, 531,246)
# 直角符号
$g.DrawLine($Pen, 251,246, 276,246); $g.DrawLine($Pen, 251,246, 251,221); $g.DrawLine($Pen, 251,221, 276,221); $g.DrawLine($Pen, 276,221, 276,246)
# 斜边正方形（右上）：B(251,35) A(531,246) B'(461,316) A'(742,526)
$pts = @( (New-Object System.Drawing.Point(531,246)), (New-Object System.Drawing.Point(251,35)), (New-Object System.Drawing.Point(461,316)), (New-Object System.Drawing.Point(742,526)) )
$g.DrawPolygon($Pen, $pts)
# 底边正方形（AC 下方）：A(531,246) C(251,246) 向下 280
$g.DrawLine($Pen, 531,246, 531,526); $g.DrawLine($Pen, 251,526, 531,526); $g.DrawLine($Pen, 251,246, 251,526)
# 左边正方形（BC 左方）：B(251,35) C(251,246) 向左 211
$g.DrawLine($Pen, 251,35, 40,35); $g.DrawLine($Pen, 40,35, 40,246); $g.DrawLine($Pen, 251,246, 40,246)
# 顶点字母（大号）
$g.DrawString('A', $FL, $Brush, 536, 250)
$g.DrawString('B', $FL, $Brush, 222, 20)
$g.DrawString('C', $FL, $Brush, 228, 250)
# 面积标注（加大，放入各正方形内）
$g.DrawString('B=25', $FL, $Brush, 500, 380)
$g.DrawString('C=9', $FL, $Brush, 340, 330)
$g.DrawString('A=?', $FR, $BrushR, 62, 90)
Save-Fig $c 'question-pythagoras-square'

$c = New-Canvas 800 600; $g = $c[1]
$g.TranslateTransform(9, 27)
$g.DrawLine($Pen, 251,246, 531,246); $g.DrawLine($Pen, 251,246, 251,35); $g.DrawLine($Pen, 251,35, 531,246)
$g.DrawLine($Pen, 251,246, 276,246); $g.DrawLine($Pen, 251,246, 251,221); $g.DrawLine($Pen, 251,221, 276,221); $g.DrawLine($Pen, 276,221, 276,246)
$g.DrawPolygon($Pen, $pts)
$g.DrawLine($Pen, 531,246, 531,526); $g.DrawLine($Pen, 251,526, 531,526); $g.DrawLine($Pen, 251,246, 251,526)
$g.DrawLine($Pen, 251,35, 40,35); $g.DrawLine($Pen, 40,35, 40,246); $g.DrawLine($Pen, 251,246, 40,246)
$g.DrawString('A', $FL, $Brush, 536, 250); $g.DrawString('B', $FL, $Brush, 222, 20); $g.DrawString('C', $FL, $Brush, 228, 250)
$g.DrawString('B=25', $FL, $Brush, 500, 380); $g.DrawString('C=9', $FL, $Brush, 340, 330)
$g.DrawString('A=16', $FR, $BrushR, 62, 90)
Save-Fig $c 'answer-pythagoras-square'

# ============ 图2：角平分线（q8）——图形铺满画布 ============
function Draw-AngleBisector([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  $g.TranslateTransform(8, 0) # 整体居中
  # A(320,80) B(90,410) C(550,410) O(320,270)
  $g.DrawLine($Pen, 320,80, 90,410)
  $g.DrawLine($Pen, 320,80, 550,410)
  $g.DrawLine($Pen, 90,410, 550,410)
  # 角平分线 BO、CO
  $g.DrawLine($Pen, 90,410, 320,270)
  $g.DrawLine($Pen, 550,410, 320,270)
  # 角A弧（约70度）
  $g.DrawArc($Pen, 286,44,68,68, 62, 58)
  # 角BOC弧
  $g.DrawArc($Pen, 268,218,104,104, -152, 124)
  # O点
  $g.FillEllipse($Brush, 314,264,12,12)
  $g.DrawString('A', $FL, $Brush, 330, 52)
  $g.DrawString('B', $FL, $Brush, 54, 412)
  $g.DrawString('C', $FL, $Brush, 546, 412)
  $g.DrawString('O', $FL, $Brush, 296, 258)
  $g.DrawString('A=70' + [char]0x00B0, $FL, $Brush, 356, 44)
  if ($answer) { $g.DrawString('BOC=125' + [char]0x00B0, $FR, $BrushR, 210, 300) }
  else { $g.DrawString('BOC=?', $FR, $BrushR, 240, 300) }
  return $c
}
$c = Draw-AngleBisector $false; Save-Fig $c 'question-angle-bisector'
$c = Draw-AngleBisector $true;  Save-Fig $c 'answer-angle-bisector'

# ============ 图3：三边13-14-15求面积（q10）——图形铺满画布 ============
function Draw-TriangleArea([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  $g.TranslateTransform(12, 0) # 整体居中
  # B(70,420) C(570,420) A(320,50) D(320,420)
  $g.DrawLine($Pen, 70,420, 570,420)
  $g.DrawLine($Pen, 70,420, 320,50)
  $g.DrawLine($Pen, 320,50, 570,420)
  $g.DrawLine($PenDash, 320,420, 320,50)
  # 直角符号（D 处）
  $g.DrawLine($Pen, 320,420, 342,420); $g.DrawLine($Pen, 320,420, 320,398); $g.DrawLine($Pen, 320,398, 342,398); $g.DrawLine($Pen, 342,398, 342,420)
  $g.DrawString('A', $FL, $Brush, 330, 20)
  $g.DrawString('B', $FL, $Brush, 34, 424)
  $g.DrawString('C', $FL, $Brush, 566, 424)
  $g.DrawString('D', $FL, $Brush, 326, 424)
  $g.DrawString('AB=15', $FL, $Brush, 108, 216)
  $g.DrawString('AC=13', $FL, $Brush, 420, 216)
  $g.DrawString('BC=14', $FL, $Brush, 276, 428)
  if ($answer) {
    $g.DrawString('AD=12', $FR, $BrushR, 330, 230)
    $g.DrawString('面积=84', $FR, $BrushR, 200, 30)
  }
  return $c
}
$c = Draw-TriangleArea $false; Save-Fig $c 'question-triangle-area'
$c = Draw-TriangleArea $true;  Save-Fig $c 'answer-triangle-area'

# ============ 图4：全等SSS（q5）——图形铺满画布 ============
function Draw-Sss([bool]$answer) {
  $c = New-Canvas 640 480; $g = $c[1]
  $g.TranslateTransform(16, 0) # 整体居中
  # A(90,300) C(550,300) B(180,70) D(460,430)
  $g.DrawLine($Pen, 90,300, 180,70)
  $g.DrawLine($Pen, 180,70, 550,300)
  $g.DrawLine($Pen, 550,300, 460,430)
  $g.DrawLine($Pen, 460,430, 90,300)
  $g.DrawLine($PenDash, 90,300, 550,300)
  $g.DrawString('A', $FL, $Brush, 62, 296)
  $g.DrawString('B', $FL, $Brush, 178, 36)
  $g.DrawString('C', $FL, $Brush, 552, 296)
  $g.DrawString('D', $FL, $Brush, 462, 434)
  # 题干标注
  $g.DrawString('AB=AD', $FL, $Brush, 56, 150)
  $g.DrawString('BC=DC', $FL, $Brush, 480, 350)
  if ($answer) {
    $g.DrawString('AC=AC(公共边)', $FR, $BrushR, 240, 310)
    $g.DrawString('SSS全等', $FR, $BrushR, 250, 16)
  }
  return $c
}
$c = Draw-Sss $false; Save-Fig $c 'question-congruent-sss'
$c = Draw-Sss $true;  Save-Fig $c 'answer-congruent-sss'

Write-Output 'ALL DONE'
