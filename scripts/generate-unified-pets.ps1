$ErrorActionPreference = 'Stop'

$dir = "C:\kaifa\Obsidian\senlin-kaifa\game-google\public\assets\pets\unified"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

Get-ChildItem -Path $dir -File | Remove-Item -Force -ErrorAction SilentlyContinue

function Get-Eyes([string]$state, [string]$eyeColor) {
  switch ($state) {
    'normal' { return "<circle cx='38' cy='46' r='9' fill='#ffffff'/><circle cx='58' cy='46' r='9' fill='#ffffff'/><circle cx='38' cy='46' r='4' fill='$eyeColor'/><circle cx='58' cy='46' r='4' fill='$eyeColor'/>" }
    'happy'  { return "<path d='M30 46 Q38 38 46 46' stroke='$eyeColor' stroke-width='3' fill='none'/><path d='M50 46 Q58 38 66 46' stroke='$eyeColor' stroke-width='3' fill='none'/><circle cx='30' cy='56' r='4' fill='#FFB3C6'/><circle cx='66' cy='56' r='4' fill='#FFB3C6'/>" }
    'tired'  { return "<path d='M30 46 H46' stroke='$eyeColor' stroke-width='3' fill='none'/><path d='M50 46 H66' stroke='$eyeColor' stroke-width='3' fill='none'/><circle cx='38' cy='50' r='2' fill='$eyeColor'/><circle cx='58' cy='50' r='2' fill='$eyeColor'/>" }
    'coma'   { return "<path d='M32 42 L44 50 M44 42 L32 50' stroke='$eyeColor' stroke-width='3' fill='none'/><path d='M52 42 L64 50 M64 42 L52 50' stroke='$eyeColor' stroke-width='3' fill='none'/>" }
    'question' { return "<circle cx='38' cy='46' r='9' fill='#ffffff'/><circle cx='58' cy='46' r='9' fill='#ffffff'/><circle cx='40' cy='46' r='4' fill='$eyeColor'/><circle cx='60' cy='46' r='4' fill='$eyeColor'/><path d='M28 36 Q36 32 44 36' stroke='$eyeColor' stroke-width='3' fill='none'/>" }
  }
}

function Get-HeadFront([string]$petId, [string]$accent, [string]$accent2) {
  switch ($petId) {
    'dog_shiba' { return "<ellipse cx='48' cy='62' rx='12' ry='8' fill='$accent2' opacity='0.9'/><circle cx='48' cy='60' r='2' fill='#2B2B2B'/>" }
    'cute_cat' { return "<line x1='22' y1='60' x2='32' y2='58' stroke='$accent2' stroke-width='2'/><line x1='22' y1='64' x2='32' y2='62' stroke='$accent2' stroke-width='2'/><line x1='74' y1='60' x2='64' y2='58' stroke='$accent2' stroke-width='2'/><line x1='74' y1='64' x2='64' y2='62' stroke='$accent2' stroke-width='2'/><circle cx='48' cy='60' r='2' fill='#2B2B2B'/>" }
    'cute_rabbit' { return "<rect x='46' y='60' width='4' height='6' rx='1' fill='$accent2'/><circle cx='48' cy='58' r='2' fill='#2B2B2B'/>" }
    'cute_dog' { return "<ellipse cx='48' cy='62' rx='10' ry='6' fill='$accent2' opacity='0.8'/><circle cx='48' cy='60' r='2' fill='#2B2B2B'/>" }
    'tech_bot' { return "<rect x='32' y='46' width='32' height='8' rx='3' fill='$accent'/><rect x='38' y='58' width='20' height='4' rx='2' fill='$accent2'/>" }
    'tech_drone' { return "<circle cx='48' cy='58' r='5' fill='$accent2'/><circle cx='48' cy='58' r='2' fill='#0B1020'/>" }
    'tech_ai' { return "<path d='M36 44 Q48 36 60 44' stroke='$accent2' stroke-width='3' fill='none'/>" }
    default { return "" }
  }
}

function Get-Body([string]$petId, [string]$body, [string]$accent, [string]$accent2) {
  switch ($petId) {
    'dog_shiba' {
      return "<ellipse cx='48' cy='74' rx='20' ry='12' fill='$body'/><ellipse cx='48' cy='76' rx='11' ry='6' fill='$accent2' opacity='0.5'/><ellipse cx='34' cy='86' rx='6' ry='4' fill='$body'/><ellipse cx='62' cy='86' rx='6' ry='4' fill='$body'/><path d='M70 74 Q84 70 76 56' stroke='$accent' stroke-width='4' fill='none'/>"
    }
    'cute_cat' {
      return "<ellipse cx='48' cy='74' rx='18' ry='11' fill='$body'/><ellipse cx='48' cy='76' rx='9' ry='5' fill='$accent2' opacity='0.35'/><ellipse cx='34' cy='86' rx='6' ry='4' fill='$body'/><ellipse cx='62' cy='86' rx='6' ry='4' fill='$body'/><path d='M70 76 Q86 72 78 60' stroke='$accent' stroke-width='4' fill='none'/>"
    }
    'cute_rabbit' {
      return "<ellipse cx='48' cy='76' rx='16' ry='10' fill='$body'/><ellipse cx='48' cy='78' rx='8' ry='4' fill='$accent' opacity='0.3'/><ellipse cx='34' cy='88' rx='7' ry='4' fill='$body'/><ellipse cx='62' cy='88' rx='7' ry='4' fill='$body'/><circle cx='70' cy='78' r='4' fill='$accent2'/>"
    }
    'cute_dog' {
      return "<ellipse cx='48' cy='74' rx='19' ry='12' fill='$body'/><rect x='30' y='64' width='36' height='6' rx='3' fill='$accent2' opacity='0.8'/><circle cx='48' cy='67' r='2' fill='#2B2B2B'/><ellipse cx='34' cy='86' rx='6' ry='4' fill='$body'/><ellipse cx='62' cy='86' rx='6' ry='4' fill='$body'/>"
    }
    'tech_bot' {
      return "<rect x='30' y='66' width='36' height='20' rx='4' fill='$body'/><rect x='34' y='70' width='28' height='6' rx='3' fill='$accent' opacity='0.7'/><rect x='24' y='70' width='6' height='10' rx='2' fill='$accent2'/><rect x='66' y='70' width='6' height='10' rx='2' fill='$accent2'/><circle cx='36' cy='82' r='2' fill='$accent2'/><circle cx='60' cy='82' r='2' fill='$accent2'/>"
    }
    'tech_drone' {
      return "<ellipse cx='48' cy='74' rx='16' ry='9' fill='$body'/><rect x='24' y='68' width='48' height='6' rx='3' fill='$accent' opacity='0.6'/><line x1='16' y1='68' x2='32' y2='60' stroke='$accent2' stroke-width='3'/><line x1='80' y1='68' x2='64' y2='60' stroke='$accent2' stroke-width='3'/><line x1='34' y1='84' x2='62' y2='84' stroke='$accent2' stroke-width='3'/>"
    }
    'tech_ai' {
      return "<ellipse cx='48' cy='76' rx='16' ry='10' fill='$body'/><ellipse cx='48' cy='76' rx='22' ry='4' fill='none' stroke='$accent2' stroke-width='2'/><circle cx='48' cy='76' r='2' fill='$accent2'/>"
    }
    default { 
      return "<ellipse cx='48' cy='74' rx='18' ry='12' fill='$body'/><ellipse cx='48' cy='76' rx='10' ry='6' fill='$accent' opacity='0.35'/><ellipse cx='34' cy='86' rx='6' ry='4' fill='$body'/><ellipse cx='62' cy='86' rx='6' ry='4' fill='$body'/>"
    }
  }
}

function Get-Mouth([string]$state, [string]$mouthColor) {
  switch ($state) {
    'normal' { return "<path d='M40 62 Q48 68 56 62' stroke='$mouthColor' stroke-width='3' fill='none'/>" }
    'happy'  { return "<path d='M36 60 Q48 72 60 60' stroke='$mouthColor' stroke-width='3' fill='none'/>" }
    'tired'  { return "<path d='M40 64 H56' stroke='$mouthColor' stroke-width='3' fill='none'/>" }
    'coma'   { return "<path d='M40 68 Q48 62 56 68' stroke='$mouthColor' stroke-width='3' fill='none'/>" }
    'question' { return "<path d='M40 62 Q48 58 56 62' stroke='$mouthColor' stroke-width='3' fill='none'/>" }
  }
}

function Get-StateExtras([string]$state) {
  switch ($state) {
    'question' { return "<circle cx='74' cy='20' r='10' fill='#ffffff' stroke='#2B2B2B' stroke-width='2'/><text x='74' y='24' text-anchor='middle' font-size='14' font-family='Arial, sans-serif' fill='#2B2B2B'>?</text>" }
    'tired' { return "<text x='70' y='18' text-anchor='middle' font-size='12' font-family='Arial, sans-serif' fill='#2B2B2B'>Zz</text>" }
    default { return "" }
  }
}

function Get-PetExtras([string]$petId, [string]$accent, [string]$accent2) {
  switch ($petId) {
    'dog_shiba' { return "<path d='M28 26 L20 14 L34 20 Z' fill='$accent'/><path d='M68 26 L62 20 L76 14 Z' fill='$accent'/><path d='M30 28 L24 20 L36 24 Z' fill='$accent2' opacity='0.8'/><path d='M66 28 L60 24 L72 20 Z' fill='$accent2' opacity='0.8'/>" }
    'cute_cat' { return "<path d='M26 26 L18 12 L34 18 Z' fill='$accent'/><path d='M70 26 L62 18 L78 12 Z' fill='$accent'/><path d='M28 28 L22 18 L34 22 Z' fill='$accent2' opacity='0.8'/><path d='M68 28 L62 22 L74 18 Z' fill='$accent2' opacity='0.8'/>" }
    'cute_rabbit' { return "<rect x='20' y='4' width='14' height='34' rx='7' fill='$accent'/><rect x='62' y='4' width='14' height='34' rx='7' fill='$accent'/><rect x='24' y='10' width='6' height='22' rx='3' fill='$accent2' opacity='0.8'/><rect x='68' y='10' width='6' height='22' rx='3' fill='$accent2' opacity='0.8'/>" }
    'cute_dog' { return "<path d='M22 30 Q10 42 22 56' fill='$accent'/><path d='M74 30 Q86 42 74 56' fill='$accent'/><circle cx='34' cy='48' r='8' fill='$accent2' opacity='0.6'/>" }
    'tech_bot' { return "<line x1='48' y1='14' x2='48' y2='4' stroke='$accent' stroke-width='3'/><circle cx='48' cy='4' r='4' fill='$accent'/><rect x='26' y='32' width='44' height='10' rx='4' fill='$accent2' opacity='0.5'/><circle cx='24' cy='40' r='3' fill='$accent2'/><circle cx='72' cy='40' r='3' fill='$accent2'/>" }
    'tech_drone' { return "<rect x='28' y='10' width='40' height='4' rx='2' fill='$accent'/><circle cx='18' cy='12' r='6' fill='$accent'/><circle cx='78' cy='12' r='6' fill='$accent'/><line x1='14' y1='12' x2='22' y2='12' stroke='#2B2B2B' stroke-width='2'/><line x1='74' y1='12' x2='82' y2='12' stroke='#2B2B2B' stroke-width='2'/>" }
    'tech_ai' { return "<circle cx='48' cy='10' r='12' fill='none' stroke='$accent' stroke-width='3'/><ellipse cx='48' cy='16' rx='18' ry='6' fill='none' stroke='$accent2' stroke-width='2'/><circle cx='72' cy='20' r='3' fill='$accent'/><circle cx='24' cy='20' r='3' fill='$accent'/>" }
  }
}

$pets = @(
  @{ id='dog_shiba';  body='#F4A261'; accent='#E76F51'; accent2='#FFF1D6'; eye='#1F1F1F' },
  @{ id='cute_cat';   body='#9FD8FF'; accent='#8EC5FC'; accent2='#FFD1F3'; eye='#1F1F1F' },
  @{ id='cute_rabbit';body='#FFE5EC'; accent='#FFB3C6'; accent2='#FFFFFF'; eye='#1F1F1F' },
  @{ id='cute_dog';   body='#FFD166'; accent='#FF8A5B'; accent2='#6D4C41'; eye='#1F1F1F' },
  @{ id='tech_bot';   body='#7BDFF2'; accent='#00D9FF'; accent2='#1F2937'; eye='#0B1020' },
  @{ id='tech_drone'; body='#C3BEF0'; accent='#A5B4FC'; accent2='#5B5F97'; eye='#0B1020' },
  @{ id='tech_ai';    body='#A7F3D0'; accent='#34D399'; accent2='#60A5FA'; eye='#0B1020' }
)

$states = @('normal','happy','tired','coma','question')

foreach ($pet in $pets) {
  foreach ($state in $states) {
    $eyes = Get-Eyes $state $pet.eye
    $mouth = Get-Mouth $state '#2B2B2B'
    $stateExtras = Get-StateExtras $state
    $petExtras = Get-PetExtras $pet.id $pet.accent $pet.accent2
    $bodyParts = Get-Body $pet.id $pet.body $pet.accent $pet.accent2
    $headFront = Get-HeadFront $pet.id $pet.accent $pet.accent2

    $svg = @"
<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
  <g stroke='#2B2B2B' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>
    $petExtras
    $bodyParts
    <circle cx='48' cy='52' r='28' fill='$($pet.body)'/>
    $headFront
    $eyes
    $mouth
    $stateExtras
  </g>
</svg>
"@

    $fileName = "{0}_{1}.svg" -f $pet.id, $state
    $filePath = Join-Path $dir $fileName
    Set-Content -Path $filePath -Value $svg -Encoding UTF8
  }
}

Write-Output "Generated: $((Get-ChildItem -Path $dir -File | Measure-Object).Count) files"
