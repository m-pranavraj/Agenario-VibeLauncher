import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class MissingTouchFeedbackRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-001', name: 'Missing Touch Feedback', description: 'Detects interactive elements without touch feedback', category: 'ux-interaction', severity: 'medium', cwe: 'CWE-1104', techniqueNumber: 232, pillar: 3, tags: ['touch', 'feedback', 'mobile'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasFeedback = findStringLiterals(ctx.parsed, s => /active:|:active|transform.*scale|opacity.*0\.|ripple|touchFeedback/i.test(s));
    const hasButtons = findStringLiterals(ctx.parsed, s => /button|<button|TouchableOpacity|Pressable|onClick|onPress/i.test(s));
    if (hasButtons.length > 0 && hasFeedback.length === 0) {
      this.emit(ctx, { title: 'No touch feedback on interactive elements', message: 'Clickable elements without active/pressed state — users get no tactile confirmation on mobile', file: '', line: 1, confidence: 75, remediation: 'Add :active CSS transform:scale(0.97) or use Pressable/TouchableOpacity with feedback colors' });
    }
  }
}

export class MissingSafeAreaHandlingRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-002', name: 'Missing Safe Area Handling', description: 'Detects missing safe area insets for notched devices', category: 'ux-interaction', severity: 'medium', cwe: 'CWE-1104', techniqueNumber: 233, pillar: 3, tags: ['safe-area', 'notch', 'mobile'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasSafeArea = findStringLiterals(ctx.parsed, s => /safe-area|env\(safe|constant\(safe|SafeAreaView|safeAreaInset/i.test(s));
    const hasMobile = findStringLiterals(ctx.parsed, s => /@media.*max-width|viewport|mobile|@media.*handheld/i.test(s));
    if (hasMobile.length > 0 && hasSafeArea.length === 0) {
      this.emit(ctx, { title: 'No safe area insets for notched devices', message: 'Mobile-responsive layout detected without safe-area-inset-* — content may hide under notches', file: '', line: 1, confidence: 80, remediation: 'Add padding: env(safe-area-inset-top/right/bottom/left) and use SafeAreaView on React Native' });
    }
  }
}

export class MissingDynamicTypeSupportRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-003', name: 'Missing Dynamic Type Support', description: 'Detects fixed font sizes without dynamic type', category: 'ux-accessibility', severity: 'medium', cwe: 'CWE-1104', techniqueNumber: 234, pillar: 3, tags: ['dynamic-type', 'font', 'accessibility'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasDynamic = findStringLiterals(ctx.parsed, s => /dynamicType|preferredContentSizeCategory|fontScale|rem|em/i.test(s) && !s.includes('px'));
    const hasFixed = findStringLiterals(ctx.parsed, s => /fontSize.*\d{2}px|font-size:.*\d{2}px/i.test(s));
    if (hasFixed.length > 3 && hasDynamic.length === 0) {
      this.emit(ctx, { title: 'Fixed font sizes prevent dynamic type scaling', message: 'Fixed px font sizes detected — visually impaired users cannot scale text via OS settings', file: '', line: 1, confidence: 78, remediation: 'Use rem/em units or Dynamic Type APIs instead of fixed px font sizes' });
    }
  }
}

export class MissingMobileGesturesRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-004', name: 'Missing Mobile Gesture Support', description: 'Detects missing swipe/pinch/gesture handlers', category: 'ux-interaction', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 235, pillar: 3, tags: ['gesture', 'swipe', 'mobile'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasGestures = findStringLiterals(ctx.parsed, s => /onSwipe|onPan|onPinch|GestureHandler|framer.*gesture|swipeable/i.test(s));
    const hasTouch = findStringLiterals(ctx.parsed, s => /touch|mobile|@media.*pointer.*coarse/i.test(s));
    if (hasTouch.length > 0 && hasGestures.length === 0) {
      this.emit(ctx, { title: 'No mobile gesture support', message: 'Mobile/touch interactions detected without gesture handlers — users expect swipe/pinch in modern apps', file: '', line: 1, confidence: 60, remediation: 'Add gesture handler library (framer-motion gestures or react-native-gesture-handler) for swipe/pinch/pan' });
    }
  }
}

export class MissingViewportMetaRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-005', name: 'Missing or Incorrect Viewport Meta', description: 'Detects missing viewport meta tag for responsive design', category: 'ux-interaction', severity: 'high', cwe: 'CWE-1104', techniqueNumber: 236, pillar: 3, tags: ['viewport', 'meta', 'responsive'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasViewport = findStringLiterals(ctx.parsed, s => /name=["']viewport["']|viewport.*content|initial-scale|width=device-width/i.test(s));
    if (!hasViewport.length) {
      this.emit(ctx, { title: 'No viewport meta tag for responsiveness', message: 'Viewport meta tag missing — mobile browsers render at desktop width, requiring zoom', file: '', line: 1, confidence: 90, remediation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> in HTML head' });
    }
  }
}

export class MissingTapTargetSizingRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-006', name: 'Insufficient Tap Target Size', description: 'Detects tap targets smaller than 44x44px', category: 'ux-accessibility', severity: 'high', cwe: 'CWE-1104', techniqueNumber: 237, pillar: 3, tags: ['tap-target', 'touch', 'mobile'] };
  async execute(ctx: RuleContext): Promise<void> {
    const smallTargets = findStringLiterals(ctx.parsed, s => /width:\s*\d{1,2}px|height:\s*\d{1,2}px|padding:\s*\d{1,2}px/i.test(s) && !s.includes('44') && !s.includes('48'));
    const hasClickable = findStringLiterals(ctx.parsed, s => /cursor.*pointer|onClick|button/i.test(s));
    if (hasClickable.length > 0 && smallTargets.length > 2) {
      this.emit(ctx, { title: 'Tap targets smaller than recommended 44x44px', message: 'Interactive elements with small dimensions — iOS/Android accessibility guidelines recommend 44x44pt minimum', file: '', line: 1, confidence: 72, remediation: 'Ensure all tap targets are at least 44x44px (consider using min-width/min-height)' });
    }
  }
}

export class MobileDarkModeSupportRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-007', name: 'Missing Dark Mode Support', description: 'Detects missing prefers-color-scheme media query', category: 'ux-interaction', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 238, pillar: 3, tags: ['dark-mode', 'theme', 'css'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasDarkMode = findStringLiterals(ctx.parsed, s => /prefers-color-scheme|dark|data-theme|class.*dark/i.test(s));
    const hasCSS = findStringLiterals(ctx.parsed, s => /background-color|color:|background:|\.css|style/i.test(s));
    if (hasCSS.length > 5 && hasDarkMode.length === 0) {
      this.emit(ctx, { title: 'No dark mode support', message: 'CSS styling detected without prefers-color-scheme media query — users with dark mode preference get bright UI', file: '', line: 1, confidence: 65, remediation: 'Add @media (prefers-color-scheme: dark) with appropriate color overrides or theme toggle' });
    }
  }
}

export class MissingOrientationLockRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-008', name: 'Missing Orientation Support', description: 'Detects missing handling for orientation changes', category: 'ux-interaction', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 239, pillar: 3, tags: ['orientation', 'mobile', 'layout'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasOrientation = findStringLiterals(ctx.parsed, s => /orientation|screen\.orientation|onorientationchange|landscape|portrait/i.test(s));
    const hasMedia = findStringLiterals(ctx.parsed, s => /@media|min-width|max-width|flex|grid/i.test(s));
    if (hasMedia.length > 0 && hasOrientation.length === 0) {
      this.emit(ctx, { title: 'No orientation change handling', message: 'Responsive CSS detected without orientation media query — layout may break on device rotation', file: '', line: 1, confidence: 50, remediation: 'Add @media (orientation: landscape) and (orientation: portrait) breakpoints, preserve state across rotation' });
    }
  }
}

export class MobileHapticFeedbackRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-009', name: 'Missing Haptic Feedback', description: 'Detects missing haptic/tactile feedback for actions', category: 'ux-interaction', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 240, pillar: 3, tags: ['haptic', 'feedback', 'mobile'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasHaptic = findStringLiterals(ctx.parsed, s => /haptic|Vibration|navigator\.vibrate|Haptics|impactOccurred|notificationOccurred/i.test(s));
    const hasActions = findFunctionCalls(ctx.parsed, c => c.fullName.includes('onPress') || c.fullName.includes('onClick') || c.fullName.includes('onSubmit'));
    if (hasActions.length > 3 && hasHaptic.length === 0) {
      this.emit(ctx, { title: 'No haptic feedback for user actions', message: 'Press/submit actions detected without haptic feedback — users miss tactile confirmation on mobile', file: '', line: 1, confidence: 55, remediation: 'Add navigator.vibrate() or expo-haptics for light/medium/heavy impact on key interactions' });
    }
  }
}

export class MobilePullToRefreshRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-010', name: 'Missing Pull-to-Refresh', description: 'Detects scrollable content without pull-to-refresh', category: 'ux-interaction', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 241, pillar: 3, tags: ['refresh', 'pull', 'mobile'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasRefresh = findStringLiterals(ctx.parsed, s => /pullToRefresh|RefreshControl|onRefresh|pull.*refresh/i.test(s));
    const hasScroll = findStringLiterals(ctx.parsed, s => /scroll|ScrollView|FlatList|overflow.*auto|overflow.*scroll/i.test(s));
    if (hasScroll.length > 0 && hasRefresh.length === 0) {
      this.emit(ctx, { title: 'No pull-to-refresh on scrollable content', message: 'Scrollable views detected without pull-to-refresh — mobile users expect to pull down to refresh data', file: '', line: 1, confidence: 62, remediation: 'Add RefreshControl to scroll views or implement custom pull-to-refresh gesture handler' });
    }
  }
}

export class MissingBottomNavSupportRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-011', name: 'Missing Bottom Navigation', description: 'Detects desktop nav without mobile bottom bar', category: 'ux-interaction', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 242, pillar: 3, tags: ['navigation', 'bottom', 'mobile'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasBottomNav = findStringLiterals(ctx.parsed, s => /bottom.*nav|tab.*bar|BottomTab|bottomNavigation/i.test(s));
    const hasTopNav = findStringLiterals(ctx.parsed, s => /nav|header|Navbar|Sidebar|navigation/i.test(s));
    if (hasTopNav.length > 0 && hasBottomNav.length === 0) {
      this.emit(ctx, { title: 'No bottom navigation for mobile', message: 'Desktop navigation detected without bottom tab bar — mobile users struggle with top/side nav on small screens', file: '', line: 1, confidence: 55, remediation: 'Add bottom tab navigation for mobile with 3-5 key destinations, keep thumb-reachable' });
    }
  }
}

export class MissingiOSPullingEffectRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-012', name: 'Missing iOS Spring/Sticky Effects', description: 'Detects missing spring animations for iOS feel', category: 'ux-interaction', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 243, pillar: 3, tags: ['spring', 'ios', 'animation'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasSpring = findStringLiterals(ctx.parsed, s => /spring|bounce|overscroll|rubberBand|sticky|momentum/i.test(s));
    const hasTouch = findStringLiterals(ctx.parsed, s => /overflow.*scroll|touch.*scroll|-webkit-overflow/i.test(s));
    if (hasTouch.length > 0 && hasSpring.length === 0) {
      this.emit(ctx, { title: 'No spring/bounce physics for iOS feel', message: 'Scroll areas without spring/bounce effects — iOS users expect rubber-band overscroll', file: '', line: 1, confidence: 45, remediation: 'Add momentum-based scrolling with spring physics for list/scroll interactions on iOS' });
    }
  }
}

export class MissingInternationalizationRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOB-013', name: 'Missing i18n/L10n Support', description: 'Detects missing internationalization framework', category: 'ux-interaction', severity: 'medium', cwe: 'CWE-1104', techniqueNumber: 244, pillar: 3, tags: ['i18n', 'localization', 'accessibility'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasI18n = findStringLiterals(ctx.parsed, s => /i18n|l10n|react-i18next|intl|formatjs|Intl\.|getLocale|useTranslation/i.test(s));
    const hasUI = findStringLiterals(ctx.parsed, s => /<[A-Z]\w+|import.*from|export.*function/i.test(s));
    if (hasUI.length > 5 && hasI18n.length === 0) {
      this.emit(ctx, { title: 'No internationalization framework', message: 'UI-heavy codebase detected without i18n — new markets require translation infrastructure', file: '', line: 1, confidence: 70, remediation: 'Add react-i18next or formatjs for internationalization with locale detection and fallback' });
    }
  }
}
