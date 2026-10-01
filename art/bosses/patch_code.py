#!/usr/bin/env python3
"""Patch BootScene.ts and PlatformGameScene.ts to use new boss portraits."""
from pathlib import Path

# === BootScene.ts: extend the list of boss portrait ids ===
boot = Path(r"C:\kaifa\game-google-clean\components\world\scenes\BootScene.ts")
text = boot.read_text(encoding="utf-8")

old_block = (
    "            const BOSS_PORTRAIT_IDS = [\n"
    "                'campaign_1', 'campaign_2', 'campaign_3', 'campaign_4',\n"
    "                'campaign_5', 'campaign_6', 'campaign_7', 'campaign_8',\n"
    "                'campaign_9', 'campaign_10', 'campaign_11', 'campaign_12',\n"
    "                'campaign_13', 'campaign_14', 'campaign_15', 'campaign_16',\n"
    "            ];\n"
)
new_block = (
    "            const BOSS_PORTRAIT_IDS = [\n"
    "                // 默认主题（每个战役一个 boss）\n"
    "                'campaign_1', 'campaign_2', 'campaign_3', 'campaign_4',\n"
    "                'campaign_5', 'campaign_6', 'campaign_7', 'campaign_8',\n"
    "                'campaign_9', 'campaign_10', 'campaign_11', 'campaign_12',\n"
    "                'campaign_13', 'campaign_14', 'campaign_15', 'campaign_16',\n"
    "                // 阶段二 boss（双 boss 关卡）\n"
    "                'campaign_7_variant_b', 'campaign_8_variant_b', 'campaign_9_variant_b',\n"
    "                // 最终 boss 三人组\n"
    "                'campaign_10_ticket_master',\n"
    "                'campaign_10_platform_master',\n"
    "                'campaign_10_conductor',\n"
    "            ];\n"
)
if old_block not in text:
    raise SystemExit("BootScene old_block not found")
text = text.replace(old_block, new_block, 1)
boot.write_text(text, encoding="utf-8")
print("[OK] BootScene.ts list extended")

# === PlatformGameScene.ts: extend createBossTexture to handle themed portraits ===
plat = Path(r"C:\kaifa\game-google-clean\components\world\scenes\PlatformGameScene.ts")
text = plat.read_text(encoding="utf-8")

old_func = (
    "    private createBossTexture(campaignId: string = 'campaign_1', visualTheme: string = 'default'): string {\n"
    "        // 优先使用 AI 立绘（campaign_1..16 的默认 boss）\n"
    "        // 变体 (variant_b / variant_c / ticket_master) 仍然走程序化贴图，\n"
    "        // 保持原有的视觉差异与战斗辨识度。\n"
    "        const usePortrait =\n"
    "            (visualTheme === 'default' || visualTheme === undefined)\n"
    "            && typeof campaignId === 'string'\n"
    "            && campaignId.startsWith('campaign_');\n"
    "        if (usePortrait) {\n"
    "            const portraitKey = `bossPortrait_${campaignId}`;\n"
    "            if (this.textures.exists(portraitKey)) {\n"
    "                return portraitKey;\n"
    "            }\n"
    "        }\n"
)
new_func = (
    "    private createBossTexture(campaignId: string = 'campaign_1', visualTheme: string = 'default'): string {\n"
    "        // 优先使用 AI 立绘（由 gpt-image2-minimax 生成的透明 PNG）\n"
    "        // 规则：\n"
    "        //   1. 默认主题 → `bossPortrait_<campaignId>`\n"
    "        //   2. 变体主题 → `bossPortrait_<campaignId>_<visualTheme>`\n"
    "        //      （如 variant_b / ticket_master / platform_master / conductor）\n"
    "        // 找不到时回落程序化贴图，保持原有的视觉差异与战斗辨识度。\n"
    "        if (typeof campaignId === 'string' && campaignId.startsWith('campaign_')) {\n"
    "            const themedKey = `bossPortrait_${campaignId}_${visualTheme}`;\n"
    "            if (this.textures.exists(themedKey)) {\n"
    "                return themedKey;\n"
    "            }\n"
    "            if (visualTheme === 'default' || visualTheme === undefined) {\n"
    "                const defaultKey = `bossPortrait_${campaignId}`;\n"
    "                if (this.textures.exists(defaultKey)) {\n"
    "                    return defaultKey;\n"
    "                }\n"
    "            }\n"
    "        }\n"
)
if old_func not in text:
    raise SystemExit("PlatformGameScene old_func not found")
text = text.replace(old_func, new_func, 1)
plat.write_text(text, encoding="utf-8")
print("[OK] PlatformGameScene.ts createBossTexture extended")

print("All patches applied.")
