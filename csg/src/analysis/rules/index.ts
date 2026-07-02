import { RuleEngine, RuleRegistry } from './engine/rule-engine.js';

/* ─── Pillar 1: Security (Base) ─────────────────────────────────── */
import { SQLInjectionDirectRule, SQLInjectionMultiHopRule, SQLInjectionSecondOrderRule, SQLInjectionORMBypassRule, SQLInjectionConcatRule, SQLInjectionDynamicWhereRule, SQLInjectionOrderByRule, SQLInjectionInClauseRule, SQLInjectionLikeClauseRule, SQLInjectionBatchQueryRule } from './security/injection-rules.js';
import { NoSQLOperatorInjectionRule, NoSQLAuthBypassRule, NoSQLWhereInjectionRule, NoSQLRegexInjectionRule, NoSQLMassAssignmentRule, NoSQLExprInjectionRule, NoSQLFunctionInjectionRule, NoSQLAggregationPipelineRule, NoSQLLookupInjectionRule, NoSQLSchemaBypassRule } from './security/nosql-injection-rules.js';
import { CommandInjectionExecRule, CommandInjectionShellExpansionRule, CommandInjectionSpawnShellRule, CommandInjectionHeaderRule, CommandInjectionURLRule, CommandInjectionSpawnArgBypassRule, CommandInjectionScriptGenRule, CommandInjectionEvalShellRule, CommandInjectionPathTraversalRule, CommandInjectionNpmScriptRule } from './security/command-injection-rules.js';
import { SSTIDirectRule, SSTIVariableInjectionRule, SSTIExtendsInjectionRule, SSTIAutoEscapeBypassRule, SSTIErrorPageRule, SSTIRawOutputRule, SSTICachePoisoningRule, SSTIDebugModeRule, SSTIInlinePartialRule, SSTIWhitespaceControlRule } from './security/ssti-rules.js';
import { JWTNoneAlgorithmRule, JWTKeyConfusionRule, JWTWeakSecretRule, InsecureRandomRule, TimingAttackRule, WeakPasswordHashRule, ECBEncryptionRule, HardcodedIVRule, NoIntegrityCheckRule, PredictableSessionTokenRule, JWTJKUInjectionRule, JWTJWKInjectionRule, JWTKidPathTraversalRule, JWTSubClaimBypassRule, JWTEmptySecretRule, JWTAudienceIssuerRule, JWTNoExpirationRule, SessionFixationRule, CSRFQueryLeakRule, OAuthStateCSRFRule, OAuthRedirectURIRule, TimingArrayEveryRule, HashLengthExtensionRule, GCMNonceReuseRule, RSAPKCS1PaddingRule, WeakTLSConfigRule, HardcodedTLSKeyRule, LoginEnumerationRule, NoRateLimitAuthRule, PredictableResetTokenRule, HardcodedSecretRule } from './security/crypto-auth-rules.js';
import { PrototypePollutionMergeRule, PrototypePollutionSetterRule, MassAssignmentORMRule, InsecureDeserializationYamlRule, InsecureDeserializationJSONRule, EvalFunctionConstructorRule, TypeJugglingRule, DeepCloneProtoPollutionRule, ObjectAssignPollutionRule, DeserializationEvalRule, PickleDeserializationRule, LodashDefaultsPollutionRule, TypeJugglingArrayRule, GraphQLMassAssignmentRule, SymbolKeyedPollutionRule, ErrorPrepareStackTraceRule, URLPrototypePollutionRule, ProxyPrototypeBypassRule, RegExpPrototypePollutionRule, ArrayFlattenPollutionRule, BinaryDeserializationRule, LDAPDeserializationRule, LoosePasswordCompareRule, ObjectIsTypeCoercionRule, MongoSetMassAssignmentRule, VMRunInThisContextRule, ReducePrototypePollutionRule, PrismaMassAssignmentRule, ExoticJSONParserPollutionRule, DefineGetterSetterPollutionRule } from './security/memory-object-rules.js';
import { SSRFetchRule, SSRFDNSRebindingRule, SSRFRedirectRule, TOCTOURaceConditionRule, CORSCredentialLeakRule, OpenRedirectRule, SSRFBlindOOBRule, SSRFPDFGeneratorRule, RequestSmugglingRule, HostHeaderInjectionRule, HTTPMethodTamperingRule, CachePoisoningUnkeyedRule, WebSocketOriginRule, GraphQLIntrospectionRule, GRPCReflectionRule } from './security/networking-logic-rules.js';

/* ─── Pillar 1: Security (Modern Extensions: ~60 new techniques) ── */
import { CORSWildcardOriginRule, GraphQLIntrospectionProdRule, MissingRateLimitingRule, OpenAPISpecExposureRule, JWTRefreshTokenRotationRule, APIKeyInURLRule, MissingHelmetSecurityHeadersRule, HostHeaderValidationRule, BodyParserSizeLimitRule, GraphQLDepthLimitRule, APIVersioningMissingRule, SSRFViaFetchRule, MissingHSTSRule } from './security/api-security-rules.js';
import { HardcodedS3BucketRule, IAMOverprivilegedRoleRule, EnvFileInRepoRule, DockerSockMountRule, HardcodedDBConnectionStringRule, PublicS3ACLRule, InsecureK8sConfigRule, ECRImageTagLatestRule, CloudRoleAssumableByAllRule, KMSKeyNoRotationRule, LambdaExposedRule } from './security/cloud-infra-rules.js';
import { DependencyConfusionRule, YarnNpmMixedLockRule, InsecurePackageSourceRule, NpmScriptInjectionRule, OutdatedDependencyRule } from './security/supply-chain-rules.js';
import { LLMPromptInjectionRule, LLMOutputValidationRule, AISecretLeakRule, AICodeExecutionRule } from './security/ai-ml-rules.js';
import { WeakPasswordPolicyRule, IdentityAccountLockoutRule, IdentityMFARule, SessionTimeoutMissingRule, IdentityJWTNoExpirationRule, OAuthStateMissingRule, InsecureCookieConfigRule, CAPTCHAMissingRule, MissingCSPRule, InsecureDirectObjectReferenceRule, MassAssignmentRule, BrokenAuthorizationRule, GraphQLBatchAttackRule, WebSocketCSRFRule, CachePoisoningRule } from './security/identity-rules.js';
import { HardcodedPrivateKeyRule, UnvalidatedWeb3CallRule, ReentrancyRiskRule, UncheckedTokenApprovalRule, FrontRunningRiskRule, FlashLoanAttackSurfaceRule, WeakRandomnessRule, MissingAccessControlRule, DelegateCallRiskRule, PhishingDetectionRule } from './security/blockchain-web3-rules.js';
import { HardcodedDeviceCredentialsRule, InsecureFirmwareUpdateRule, InsecureMQTTRule, InsecureBluetoothConfigRule, MissingDeviceIdentityRule, InsecureCoAPRule, OTAUpdateNoRollbackRule, SideChannelTimingRule } from './security/iot-embedded-rules.js';

/* ─── Pillar 2: Performance ────────────────────────────────────── */
import { NPlusOneQueryRule, MissingIndexRule, CartesianProductJoinRule, LargeInClauseRule, MissingCompositeIndexRule, ImplicitTypeCastRule, GraphQLDataloaderMissRule, MissingPaginationRule, DeepNestedLoopRule, SelectStarRule, MissingBatchInsertRule, RawSQLConcatenationRule, MissingPoolTimeoutRule, LikeLeadingWildcardRule, MissingOffsetPaginationRule, UnindexedFilterColumnRule, ORConditionNoIndexMergeRule, OrderByExpressionRule, LargeInListRule, ImplicitCrossJoinRule, SubqueryToJoinRule, MissingQueryTimeoutRule, CountStarWithoutApproxRule, FunctionOnColumnRule, DeepNestedWhereRule } from './performance/algorithmic-rules.js';
import { ReactClosureLeakRule, UnboundedCacheRule, ConnectionPoolExhaustionRule, TimerLeakRule, DetachedDOMLeakRule, ObserverUnsubscribeRule, EventEmitterLeakRule, ClosureLargeCaptureRule, RAFWithoutCancelRule, SubscriptionLeakRule, ClassTimerLeakRule, ConsoleLogRetentionRule, WebSocketReconnectLeakRule, LargeInlineDataRule, CircularReferenceLeakRule, StringConcatLeakRule, ObjectURLNotRevokedRule, AbortControllerLeakRule, ResizeObserverLoopRule, MissingReactKeyRule, InlineFunctionJSXRule, LargeContextReRenderRule, StorageWriteInRenderRule } from './performance/memory-leak-rules.js';
import { SyncBlockingRule, PromiseWaterfallRule, BundleBloatRule, LargeJSONMainThreadRule, CPUHeavyLoopRule, UnawaitedPromiseRule, RecursiveTimeoutDriftRule, LayoutThrashingRule, ImageMissingDimensionsRule, MissingCodeSplitRule, InlineScriptRenderBlockRule, RAFWithoutCancelRule2, IntervalNoClearRule, ExcessiveDOMNodesRule, SyncXHRRule, InnerHTMLInLoopRule, ForcedReflowRule, MissingDocumentFragmentRule, TooManyEventListenersRule, MissingDebounceScrollRule, MissingIdleCallbackRule, HistoryInLoopRule, ScrollIntoViewJankRule, MissingWillChangeRule, MissingIntersectionObserverRule } from './performance/event-loop-rules.js';

/* ─── Pillar 2: Performance (Modern Extensions: ~5 new techniques) ── */
import { WaterfallAPICallsRule, LargeBundleSizeRule, UnmemoizedComponentRule, ImageWithoutDimensionsRule, MissingLoadingOptimizationRule } from './performance/modern-perf-rules.js';

/* ─── Pillar 2: Performance (Advanced Network/Rendering Optimization: ~15 techniques) ── */
import { HTTP2NotEnabledRule, MissingConnectionPoolingRule, MissingCDNConfigRule, MissingCacheHeadersRule, MissingResourceHintsRule, BundleNotOptimizedRule, MissingTreeShakingRule, MissingImageOptimizationRule, MissingGzipCompressionRule, MissingFontOptimizationRule, MissingSSRStreamingRule, MissingServiceWorkerRule, LongTaskMainThreadRule, MissingCriticalCSSRule, MissingLazyHydrationRule } from './performance/network-optimization-rules.js';

/* ─── Pillar 3: UX/UI ──────────────────────────────────────────── */
import { ClickableDivNoKeyboardRule, MissingAltTextRule, IconButtonNoLabelRule, MissingFocusTrapRule, MissingInputLabelRule, MissingAriaLandmarksRule, LowColorContrastRule, LogicalFocusOrderRule, MissingSkipLinkRule, MissingFormErrorAnnouncementRule, SmallTouchTargetRule, MissingHeadingHierarchyRule, MissingHtmlLangRule, MissingAriaExpandedRule, MissingAriaCurrentRule, AutoplayNoControlsRule, IframeMissingTitleRule, MissingTableHeaderScopeRule, MissingVideoCaptionsRule, MissingAudioTranscriptRule, MissingAbbreviationExpansionRule, MissingTableCaptionRule, MissingFigureCaptionRule, MissingFieldsetLegendRule, MissingCharCounterRule, MissingAccessibleEmojiRule, MissingFocusVisibleRule, MissingListSemanticsRule, MissingDescriptionListRule, MissingTextSpacingSupportRule, MissingZoomSupportRule, MissingTouchTargetSpacingRule } from './ux/accessibility-rules.js';
import { SilentCatchRule, NavigationDeadEndRule, CumulativeLayoutShiftRule, FirstInputDelayRule, MissingLoadingStateRule, MissingEmptyStateRule, MissingConfirmationDialogRule, MissingUndoRule, MissingFormValidationRule, InfiniteScrollNoIndicatorRule, ToastNoAutoDismissRule, ModalNoCloseButtonRule, SearchWithoutDebounceRule, MissingDocumentTitleRule, MultiStepNoProgressRule, UnsavedChangesPromptRule, MissingSkeletonLoaderRule, MissingLazyLoadingRule, MissingStateTransitionRule, FontLoadingFOUTRule, MissingProgressiveLoadingRule, MissingOptimisticUpdateRule, MissingPullToRefreshRule, MissingSwipeGestureRule, MissingOfflineIndicatorRule, MissingRetryOnErrorRule, MissingBackNavigationHandlerRule, MissingDeepLinkRule, MissingClipboardFeedbackRule, MissingDragDropFeedbackRule, MissingSearchHistoryRule, MissingAutocompleteRule, MissingIdleSessionTimeoutRule, MissingTabSyncRule, MissingBeforeInstallPromptRule, MissingKeyboardNavigationGridRule, MissingAccessibilityAnnouncementRule, MissingImageZoomRule, MissingPushNotificationPermissionRule, MissingCameraMicFallbackRule, MissingFileUploadProgressRule, MissingDataExportProgressRule, MissingCharLimitIndicatorRule, MissingPasswordStrengthIndicatorRule, MissingInputMaskRule, MissingAutoSaveIndicatorRule, MissingLongPressContextMenuRule, MissingKeyboardDismissOnScrollRule, MissingPullToRefreshDataRule, MissingEmptySearchStateRule, MissingNetworkErrorStateRule, MissingFirstRunExperienceRule, MissingHapticFeedbackRule, MissingSafeAreaRule, MissingDarkModeSupportRule } from './ux/interaction-rules.js';

/* ─── Pillar 3: UX/UI (Modern Extensions: ~5 new techniques) ──────── */
import { MissingReducedMotionRule, MissingColorSchemeMetaRule, MissingTouchTargetSizeRule, MissingFontSizeResponsiveRule, MissingInputModeMobileRule } from './ux/modern-ux-rules.js';

/* ─── Pillar 3: UX/UI (Advanced Mobile Native/Internationalization: ~13 techniques) ── */
import { MissingTouchFeedbackRule, MissingSafeAreaHandlingRule, MissingDynamicTypeSupportRule, MissingMobileGesturesRule, MissingViewportMetaRule, MissingTapTargetSizingRule, MobileDarkModeSupportRule, MissingOrientationLockRule, MobileHapticFeedbackRule, MobilePullToRefreshRule, MissingBottomNavSupportRule, MissingiOSPullingEffectRule, MissingInternationalizationRule } from './ux/mobile-native-rules.js';

/* ─── Pillar 4: Compliance ──────────────────────────────────────── */
import { PIILeakageToLogRule, PIIInResponseRule, CookieConsentValidationRule, RightToErasureRule, MissingDataRetentionRule, PIIInCustomHeadersRule, MissingCookieBannerRule, PIIInQueryParamsRule, MissingPrivacyPolicyRule, MissingDSAREndpointRule, PIIInErrorResponseRule, PIIInSSRRule, MissingSameSiteCookieRule, PIIInFileExportRule, MissingDataProcessingRecordRule, MissingDataClassificationRule, MissingConsentPreferenceStorageRule, MissingPersonalDataExportFormatRule, MissingPIIEncryptionAtRestRule, MissingPseudoAnonymizationRule, MissingCookiePreferencesRule, MissingDataMappingRule, MissingConsentRecordKeepingRule, MissingThirdPartyDataSharingDisclosureRule, MissingAgeGateRule, MissingSensitiveDataMaskingRule, MissingPrivacyNoticeLinkRule, MissingUserDataAccessDashboardRule, MissingBiometricConsentRule, MissingLocationConsentRule } from './compliance/privacy-rules.js';
import { MissingAuditTrailRule, MissingDataEncryptionRule, MissingHealthCheckRule, CreditCardInLogsRule, CrossBorderDataTransferRule, MissingPHIAccessLogRule, CardDataInTransitRule, MissingCSPHeaderRule, MissingSecurityHeadersRule, SensitiveEndpointRateLimitRule, MissingAPIVersioningRule, MissingDataBackupRule, MissingCorsRestrictionRule, MissingAccountLockoutRule, MissingDataPortabilityRule, MissingPasswordPolicyRule, MissingBreachNotificationRule, MissingConsentWithdrawalRule, MissingDataMinimizationRule, MissingDataPurgeRule, MissingProcessorRegisterRule, MissingVulnerabilityScanRule, MissingDependencyAuditRule, MissingSecretScanningRule, MissingAccessReviewRule, MissingSessionTimeoutRule, MissingMFARule, MissingLoginAttemptTrackingRule, MissingHIPAAAuthorizationRule, MissingPCIComplianceCheckRule, MissingSOC2MonitoringRule, MissingDisasterRecoveryRule, MissingChangeManagementRule, MissingVendorAssessmentRule, MissingEmployeeTrainingLogRule, MissingThirdPartyAccessLogRule, MissingDataRetentionPolicyHeaderRule, MissingIncidentResponsePlanRule } from './compliance/framework-rules.js';

/* ─── Pillar 4: Compliance (Modern Extensions: ~8 new techniques) ─── */
import { MissingAccessibilityStatementRule, MissingCookieConsentPreferencesRule, MissingPrivacyPolicyURule, MissingTermsOfServiceRule, MissingDataDeletionEndpointRule, MissingDataExportEndpointRule, MissingAgeVerificationRule, MissingSMTPAuthRule } from './compliance/modern-compliance-rules.js';

/* ─── Pillar 4: Compliance (Advanced Industry-Specific/Data Governance: ~14 techniques) ── */
import { MissingHIPAAAuthControlsRule, MissingPCIDSSCardDataRule, MissingSOC2AuditLoggingRule, MissingGDPRConsentStorageRule, MissingCCPARule, MissingDataBreachNotificationRule, MissingDataRetentionScheduleRule, IndustryDataProcessingRecordRule, MissingPseudonymizationRule, MissingCookieConsentPreferencesRule as MissingCookieConsentGranularRule, MissingThirdPartyDataSharingRule, MissingDSARAutomationRule, MissingDataMinimizationCheckRule, MissingPrivacyByDesignRule } from './compliance/industry-specific-rules.js';

export function createRuleRegistry(): RuleRegistry {
  const registry = new RuleRegistry();

  /* ═══════════════════════════════════════════════════════════════
     PILLAR 1: SECURITY (150 base + ~40 modern = ~190 techniques)
     ═══════════════════════════════════════════════════════════════ */

  // Injection: SQLi (techniques 1-10)
  registry.register(new SQLInjectionDirectRule());
  registry.register(new SQLInjectionMultiHopRule());
  registry.register(new SQLInjectionSecondOrderRule());
  registry.register(new SQLInjectionORMBypassRule());
  registry.register(new SQLInjectionConcatRule());
  registry.register(new SQLInjectionDynamicWhereRule());
  registry.register(new SQLInjectionOrderByRule());
  registry.register(new SQLInjectionInClauseRule());
  registry.register(new SQLInjectionLikeClauseRule());
  registry.register(new SQLInjectionBatchQueryRule());

  // Injection: NoSQL (techniques 11-20)
  registry.register(new NoSQLOperatorInjectionRule());
  registry.register(new NoSQLAuthBypassRule());
  registry.register(new NoSQLWhereInjectionRule());
  registry.register(new NoSQLRegexInjectionRule());
  registry.register(new NoSQLMassAssignmentRule());
  registry.register(new NoSQLExprInjectionRule());
  registry.register(new NoSQLFunctionInjectionRule());
  registry.register(new NoSQLAggregationPipelineRule());
  registry.register(new NoSQLLookupInjectionRule());
  registry.register(new NoSQLSchemaBypassRule());

  // Injection: Command (techniques 21-30)
  registry.register(new CommandInjectionExecRule());
  registry.register(new CommandInjectionShellExpansionRule());
  registry.register(new CommandInjectionSpawnShellRule());
  registry.register(new CommandInjectionHeaderRule());
  registry.register(new CommandInjectionURLRule());
  registry.register(new CommandInjectionSpawnArgBypassRule());
  registry.register(new CommandInjectionScriptGenRule());
  registry.register(new CommandInjectionEvalShellRule());
  registry.register(new CommandInjectionPathTraversalRule());
  registry.register(new CommandInjectionNpmScriptRule());

  // Injection: SSTI (techniques 31-40)
  registry.register(new SSTIDirectRule());
  registry.register(new SSTIVariableInjectionRule());
  registry.register(new SSTIExtendsInjectionRule());
  registry.register(new SSTIAutoEscapeBypassRule());
  registry.register(new SSTIErrorPageRule());
  registry.register(new SSTIRawOutputRule());
  registry.register(new SSTICachePoisoningRule());
  registry.register(new SSTIDebugModeRule());
  registry.register(new SSTIInlinePartialRule());
  registry.register(new SSTIWhitespaceControlRule());

  // Crypto & Auth (techniques 41-71)
  registry.register(new JWTNoneAlgorithmRule());
  registry.register(new JWTKeyConfusionRule());
  registry.register(new JWTWeakSecretRule());
  registry.register(new InsecureRandomRule());
  registry.register(new TimingAttackRule());
  registry.register(new WeakPasswordHashRule());
  registry.register(new ECBEncryptionRule());
  registry.register(new HardcodedIVRule());
  registry.register(new NoIntegrityCheckRule());
  registry.register(new PredictableSessionTokenRule());
  registry.register(new JWTJKUInjectionRule());
  registry.register(new JWTJWKInjectionRule());
  registry.register(new JWTKidPathTraversalRule());
  registry.register(new JWTSubClaimBypassRule());
  registry.register(new JWTEmptySecretRule());
  registry.register(new JWTAudienceIssuerRule());
  registry.register(new JWTNoExpirationRule());
  registry.register(new SessionFixationRule());
  registry.register(new CSRFQueryLeakRule());
  registry.register(new OAuthStateCSRFRule());
  registry.register(new OAuthRedirectURIRule());
  registry.register(new TimingArrayEveryRule());
  registry.register(new HashLengthExtensionRule());
  registry.register(new GCMNonceReuseRule());
  registry.register(new RSAPKCS1PaddingRule());
  registry.register(new WeakTLSConfigRule());
  registry.register(new HardcodedTLSKeyRule());
  registry.register(new LoginEnumerationRule());
  registry.register(new NoRateLimitAuthRule());
  registry.register(new PredictableResetTokenRule());
  registry.register(new HardcodedSecretRule());

  // Memory & Object Attacks (techniques 71-110)
  registry.register(new PrototypePollutionMergeRule());
  registry.register(new PrototypePollutionSetterRule());
  registry.register(new MassAssignmentORMRule());
  registry.register(new InsecureDeserializationYamlRule());
  registry.register(new InsecureDeserializationJSONRule());
  registry.register(new EvalFunctionConstructorRule());
  registry.register(new TypeJugglingRule());
  registry.register(new DeepCloneProtoPollutionRule());
  registry.register(new ObjectAssignPollutionRule());
  registry.register(new LodashDefaultsPollutionRule());
  registry.register(new GraphQLMassAssignmentRule());
  registry.register(new DeserializationEvalRule());
  registry.register(new PickleDeserializationRule());
  registry.register(new TypeJugglingArrayRule());
  registry.register(new SymbolKeyedPollutionRule());
  registry.register(new ErrorPrepareStackTraceRule());
  registry.register(new URLPrototypePollutionRule());
  registry.register(new ProxyPrototypeBypassRule());
  registry.register(new RegExpPrototypePollutionRule());
  registry.register(new ArrayFlattenPollutionRule());
  registry.register(new BinaryDeserializationRule());
  registry.register(new LDAPDeserializationRule());
  registry.register(new LoosePasswordCompareRule());
  registry.register(new ObjectIsTypeCoercionRule());
  registry.register(new MongoSetMassAssignmentRule());
  registry.register(new VMRunInThisContextRule());
  registry.register(new ReducePrototypePollutionRule());
  registry.register(new PrismaMassAssignmentRule());
  registry.register(new ExoticJSONParserPollutionRule());
  registry.register(new DefineGetterSetterPollutionRule());

  // Networking & Logic (techniques 111-150)
  registry.register(new SSRFetchRule());
  registry.register(new SSRFDNSRebindingRule());
  registry.register(new SSRFRedirectRule());
  registry.register(new TOCTOURaceConditionRule());
  registry.register(new CORSCredentialLeakRule());
  registry.register(new OpenRedirectRule());
  registry.register(new SSRFBlindOOBRule());
  registry.register(new SSRFPDFGeneratorRule());
  registry.register(new RequestSmugglingRule());
  registry.register(new HostHeaderInjectionRule());
  registry.register(new HTTPMethodTamperingRule());
  registry.register(new CachePoisoningUnkeyedRule());
  registry.register(new WebSocketOriginRule());
  registry.register(new GraphQLIntrospectionRule());
  registry.register(new GRPCReflectionRule());

  // ── SECURITY MODERN EXTENSIONS: API Security (techniques 151-163) ──
  registry.register(new CORSWildcardOriginRule());
  registry.register(new GraphQLIntrospectionProdRule());
  registry.register(new MissingRateLimitingRule());
  registry.register(new OpenAPISpecExposureRule());
  registry.register(new JWTRefreshTokenRotationRule());
  registry.register(new APIKeyInURLRule());
  registry.register(new MissingHelmetSecurityHeadersRule());
  registry.register(new HostHeaderValidationRule());
  registry.register(new BodyParserSizeLimitRule());
  registry.register(new GraphQLDepthLimitRule());
  registry.register(new APIVersioningMissingRule());
  registry.register(new SSRFViaFetchRule());
  registry.register(new MissingHSTSRule());

  // ── SECURITY MODERN EXTENSIONS: Cloud/Infra (techniques 164-174) ──
  registry.register(new HardcodedS3BucketRule());
  registry.register(new IAMOverprivilegedRoleRule());
  registry.register(new EnvFileInRepoRule());
  registry.register(new DockerSockMountRule());
  registry.register(new HardcodedDBConnectionStringRule());
  registry.register(new PublicS3ACLRule());
  registry.register(new InsecureK8sConfigRule());
  registry.register(new ECRImageTagLatestRule());
  registry.register(new CloudRoleAssumableByAllRule());
  registry.register(new KMSKeyNoRotationRule());
  registry.register(new LambdaExposedRule());

  // ── SECURITY MODERN EXTENSIONS: Supply Chain (techniques 175-179) ──
  registry.register(new DependencyConfusionRule());
  registry.register(new YarnNpmMixedLockRule());
  registry.register(new InsecurePackageSourceRule());
  registry.register(new NpmScriptInjectionRule());
  registry.register(new OutdatedDependencyRule());

  // ── SECURITY MODERN EXTENSIONS: AI/ML Safety (techniques 180-183) ──
  registry.register(new LLMPromptInjectionRule());
  registry.register(new LLMOutputValidationRule());
  registry.register(new AISecretLeakRule());
  registry.register(new AICodeExecutionRule());

  // ── SECURITY MODERN EXTENSIONS: Identity/Auth (techniques 184-198) ──
  registry.register(new WeakPasswordPolicyRule());
  registry.register(new IdentityAccountLockoutRule());
  registry.register(new IdentityMFARule());
  registry.register(new SessionTimeoutMissingRule());
  registry.register(new IdentityJWTNoExpirationRule());
  registry.register(new OAuthStateMissingRule());
  registry.register(new InsecureCookieConfigRule());
  registry.register(new CAPTCHAMissingRule());
  registry.register(new MissingCSPRule());
  registry.register(new InsecureDirectObjectReferenceRule());
  registry.register(new MassAssignmentRule());
  registry.register(new BrokenAuthorizationRule());
  registry.register(new GraphQLBatchAttackRule());
  registry.register(new WebSocketCSRFRule());
  registry.register(new CachePoisoningRule());

  // ── SECURITY MODERN EXTENSIONS: Blockchain/Web3 (techniques 199-208) ──
  registry.register(new HardcodedPrivateKeyRule());
  registry.register(new UnvalidatedWeb3CallRule());
  registry.register(new ReentrancyRiskRule());
  registry.register(new UncheckedTokenApprovalRule());
  registry.register(new FrontRunningRiskRule());
  registry.register(new FlashLoanAttackSurfaceRule());
  registry.register(new WeakRandomnessRule());
  registry.register(new MissingAccessControlRule());
  registry.register(new DelegateCallRiskRule());
  registry.register(new PhishingDetectionRule());

  // ── SECURITY MODERN EXTENSIONS: IoT/Embedded (techniques 209-216) ──
  registry.register(new HardcodedDeviceCredentialsRule());
  registry.register(new InsecureFirmwareUpdateRule());
  registry.register(new InsecureMQTTRule());
  registry.register(new InsecureBluetoothConfigRule());
  registry.register(new MissingDeviceIdentityRule());
  registry.register(new InsecureCoAPRule());
  registry.register(new OTAUpdateNoRollbackRule());
  registry.register(new SideChannelTimingRule());

  /* ═══════════════════════════════════════════════════════════════
     PILLAR 2: PERFORMANCE (75 base + ~5 modern = ~80 techniques)
     ═══════════════════════════════════════════════════════════════ */

  // Algorithmic & Database
  registry.register(new NPlusOneQueryRule());
  registry.register(new GraphQLDataloaderMissRule());
  registry.register(new LargeInClauseRule());
  registry.register(new MissingPaginationRule());
  registry.register(new MissingOffsetPaginationRule());
  registry.register(new LargeInListRule());
  registry.register(new MissingQueryTimeoutRule());
  registry.register(new CountStarWithoutApproxRule());
  registry.register(new SelectStarRule());
  registry.register(new MissingBatchInsertRule());
  registry.register(new RawSQLConcatenationRule());
  registry.register(new MissingPoolTimeoutRule());
  registry.register(new MissingIndexRule());
  registry.register(new MissingCompositeIndexRule());
  registry.register(new ImplicitTypeCastRule());
  registry.register(new LikeLeadingWildcardRule());
  registry.register(new UnindexedFilterColumnRule());
  registry.register(new ORConditionNoIndexMergeRule());
  registry.register(new OrderByExpressionRule());
  registry.register(new FunctionOnColumnRule());
  registry.register(new DeepNestedWhereRule());
  registry.register(new CartesianProductJoinRule());
  registry.register(new DeepNestedLoopRule());
  registry.register(new ImplicitCrossJoinRule());
  registry.register(new SubqueryToJoinRule());

  // Memory & State Leaks
  registry.register(new ReactClosureLeakRule());
  registry.register(new DetachedDOMLeakRule());
  registry.register(new ObserverUnsubscribeRule());
  registry.register(new EventEmitterLeakRule());
  registry.register(new ClosureLargeCaptureRule());
  registry.register(new RAFWithoutCancelRule());
  registry.register(new SubscriptionLeakRule());
  registry.register(new ConsoleLogRetentionRule());
  registry.register(new WebSocketReconnectLeakRule());
  registry.register(new LargeInlineDataRule());
  registry.register(new CircularReferenceLeakRule());
  registry.register(new StringConcatLeakRule());
  registry.register(new ObjectURLNotRevokedRule());
  registry.register(new AbortControllerLeakRule());
  registry.register(new ResizeObserverLoopRule());
  registry.register(new MissingReactKeyRule());
  registry.register(new InlineFunctionJSXRule());
  registry.register(new LargeContextReRenderRule());
  registry.register(new StorageWriteInRenderRule());
  registry.register(new TimerLeakRule());
  registry.register(new ClassTimerLeakRule());
  registry.register(new UnboundedCacheRule());
  registry.register(new ConnectionPoolExhaustionRule());

  // Event Loop & Rendering
  registry.register(new SyncBlockingRule());
  registry.register(new LargeJSONMainThreadRule());
  registry.register(new CPUHeavyLoopRule());
  registry.register(new UnawaitedPromiseRule());
  registry.register(new RecursiveTimeoutDriftRule());
  registry.register(new PromiseWaterfallRule());
  registry.register(new LayoutThrashingRule());
  registry.register(new ImageMissingDimensionsRule());
  registry.register(new InlineScriptRenderBlockRule());
  registry.register(new RAFWithoutCancelRule2());
  registry.register(new IntervalNoClearRule());
  registry.register(new ExcessiveDOMNodesRule());
  registry.register(new SyncXHRRule());
  registry.register(new InnerHTMLInLoopRule());
  registry.register(new ForcedReflowRule());
  registry.register(new MissingDocumentFragmentRule());
  registry.register(new TooManyEventListenersRule());
  registry.register(new BundleBloatRule());
  registry.register(new MissingCodeSplitRule());
  registry.register(new MissingDebounceScrollRule());
  registry.register(new MissingIdleCallbackRule());
  registry.register(new HistoryInLoopRule());
  registry.register(new ScrollIntoViewJankRule());
  registry.register(new MissingWillChangeRule());
  registry.register(new MissingIntersectionObserverRule());

  // ── PERFORMANCE MODERN EXTENSIONS (techniques 149-153) ──
  registry.register(new WaterfallAPICallsRule());
  registry.register(new LargeBundleSizeRule());
  registry.register(new UnmemoizedComponentRule());
  registry.register(new ImageWithoutDimensionsRule());
  registry.register(new MissingLoadingOptimizationRule());

  // ── PERFORMANCE ADVANCED: Network/Rendering Optimization (techniques 217-231) ──
  registry.register(new HTTP2NotEnabledRule());
  registry.register(new MissingConnectionPoolingRule());
  registry.register(new MissingCDNConfigRule());
  registry.register(new MissingCacheHeadersRule());
  registry.register(new MissingResourceHintsRule());
  registry.register(new BundleNotOptimizedRule());
  registry.register(new MissingTreeShakingRule());
  registry.register(new MissingImageOptimizationRule());
  registry.register(new MissingGzipCompressionRule());
  registry.register(new MissingFontOptimizationRule());
  registry.register(new MissingSSRStreamingRule());
  registry.register(new MissingServiceWorkerRule());
  registry.register(new LongTaskMainThreadRule());
  registry.register(new MissingCriticalCSSRule());
  registry.register(new MissingLazyHydrationRule());

  /* ═══════════════════════════════════════════════════════════════
     PILLAR 3: UX/UI (62 base + ~5 modern = ~67 techniques)
     ═══════════════════════════════════════════════════════════════ */

  // Accessibility
  registry.register(new ClickableDivNoKeyboardRule());
  registry.register(new MissingAriaLandmarksRule());
  registry.register(new MissingSkipLinkRule());
  registry.register(new MissingHeadingHierarchyRule());
  registry.register(new MissingHtmlLangRule());
  registry.register(new MissingAriaExpandedRule());
  registry.register(new MissingAriaCurrentRule());
  registry.register(new AutoplayNoControlsRule());
  registry.register(new IframeMissingTitleRule());
  registry.register(new MissingTableHeaderScopeRule());
  registry.register(new MissingVideoCaptionsRule());
  registry.register(new MissingAudioTranscriptRule());
  registry.register(new MissingAbbreviationExpansionRule());
  registry.register(new MissingTableCaptionRule());
  registry.register(new MissingFigureCaptionRule());
  registry.register(new MissingFieldsetLegendRule());
  registry.register(new MissingCharCounterRule());
  registry.register(new MissingAccessibleEmojiRule());
  registry.register(new MissingFocusVisibleRule());
  registry.register(new MissingListSemanticsRule());
  registry.register(new MissingDescriptionListRule());
  registry.register(new MissingTextSpacingSupportRule());
  registry.register(new MissingZoomSupportRule());
  registry.register(new MissingTouchTargetSpacingRule());
  registry.register(new MissingFocusTrapRule());
  registry.register(new LogicalFocusOrderRule());
  registry.register(new LowColorContrastRule());
  registry.register(new MissingAltTextRule());
  registry.register(new IconButtonNoLabelRule());
  registry.register(new MissingInputLabelRule());
  registry.register(new MissingFormErrorAnnouncementRule());
  registry.register(new SmallTouchTargetRule());

  // Interaction & Perceived Performance
  registry.register(new NavigationDeadEndRule());
  registry.register(new MissingLoadingStateRule());
  registry.register(new MissingEmptyStateRule());
  registry.register(new MissingConfirmationDialogRule());
  registry.register(new MissingUndoRule());
  registry.register(new InfiniteScrollNoIndicatorRule());
  registry.register(new ModalNoCloseButtonRule());
  registry.register(new SearchWithoutDebounceRule());
  registry.register(new MissingDocumentTitleRule());
  registry.register(new MultiStepNoProgressRule());
  registry.register(new UnsavedChangesPromptRule());
  registry.register(new SilentCatchRule());
  registry.register(new ToastNoAutoDismissRule());
  registry.register(new CumulativeLayoutShiftRule());
  registry.register(new MissingSkeletonLoaderRule());
  registry.register(new MissingLazyLoadingRule());
  registry.register(new MissingStateTransitionRule());
  registry.register(new FontLoadingFOUTRule());
  registry.register(new MissingProgressiveLoadingRule());
  registry.register(new MissingFormValidationRule());
  registry.register(new FirstInputDelayRule());
  registry.register(new MissingOptimisticUpdateRule());
  registry.register(new MissingPullToRefreshRule());
  registry.register(new MissingSwipeGestureRule());
  registry.register(new MissingOfflineIndicatorRule());
  registry.register(new MissingRetryOnErrorRule());
  registry.register(new MissingBackNavigationHandlerRule());
  registry.register(new MissingDeepLinkRule());
  registry.register(new MissingClipboardFeedbackRule());
  registry.register(new MissingDragDropFeedbackRule());
  registry.register(new MissingSearchHistoryRule());
  registry.register(new MissingAutocompleteRule());
  registry.register(new MissingIdleSessionTimeoutRule());
  registry.register(new MissingTabSyncRule());
  registry.register(new MissingBeforeInstallPromptRule());
  registry.register(new MissingKeyboardNavigationGridRule());
  registry.register(new MissingAccessibilityAnnouncementRule());
  registry.register(new MissingImageZoomRule());
  registry.register(new MissingPushNotificationPermissionRule());
  registry.register(new MissingCameraMicFallbackRule());
  registry.register(new MissingFileUploadProgressRule());
  registry.register(new MissingDataExportProgressRule());
  registry.register(new MissingCharLimitIndicatorRule());
  registry.register(new MissingPasswordStrengthIndicatorRule());
  registry.register(new MissingInputMaskRule());
  registry.register(new MissingAutoSaveIndicatorRule());
  registry.register(new MissingLongPressContextMenuRule());
  registry.register(new MissingKeyboardDismissOnScrollRule());
  registry.register(new MissingPullToRefreshDataRule());
  registry.register(new MissingEmptySearchStateRule());
  registry.register(new MissingNetworkErrorStateRule());
  registry.register(new MissingFirstRunExperienceRule());
  registry.register(new MissingHapticFeedbackRule());
  registry.register(new MissingSafeAreaRule());
  registry.register(new MissingDarkModeSupportRule());

  // ── UX MODERN EXTENSIONS (techniques 98-102) ──
  registry.register(new MissingReducedMotionRule());
  registry.register(new MissingColorSchemeMetaRule());
  registry.register(new MissingTouchTargetSizeRule());
  registry.register(new MissingFontSizeResponsiveRule());
  registry.register(new MissingInputModeMobileRule());

  // ── UX ADVANCED: Mobile Native & i18n (techniques 232-244) ──
  registry.register(new MissingTouchFeedbackRule());
  registry.register(new MissingSafeAreaHandlingRule());
  registry.register(new MissingDynamicTypeSupportRule());
  registry.register(new MissingMobileGesturesRule());
  registry.register(new MissingViewportMetaRule());
  registry.register(new MissingTapTargetSizingRule());
  registry.register(new MobileDarkModeSupportRule());
  registry.register(new MissingOrientationLockRule());
  registry.register(new MobileHapticFeedbackRule());
  registry.register(new MobilePullToRefreshRule());
  registry.register(new MissingBottomNavSupportRule());
  registry.register(new MissingiOSPullingEffectRule());
  registry.register(new MissingInternationalizationRule());

  /* ═══════════════════════════════════════════════════════════════
     PILLAR 4: COMPLIANCE (68 base + ~8 modern = ~76 techniques)
     ═══════════════════════════════════════════════════════════════ */

  // Privacy (GDPR, CCPA)
  registry.register(new PIILeakageToLogRule());
  registry.register(new PIIInResponseRule());
  registry.register(new PIIInCustomHeadersRule());
  registry.register(new PIIInQueryParamsRule());
  registry.register(new MissingPrivacyPolicyRule());
  registry.register(new PIIInErrorResponseRule());
  registry.register(new PIIInSSRRule());
  registry.register(new PIIInFileExportRule());
  registry.register(new MissingDataProcessingRecordRule());
  registry.register(new MissingDataMinimizationRule());
  registry.register(new RightToErasureRule());
  registry.register(new MissingDSAREndpointRule());
  registry.register(new MissingDataPortabilityRule());
  registry.register(new MissingBreachNotificationRule());
  registry.register(new CookieConsentValidationRule());
  registry.register(new MissingCookieBannerRule());
  registry.register(new MissingSameSiteCookieRule());
  registry.register(new MissingConsentWithdrawalRule());
  registry.register(new MissingDataClassificationRule());
  registry.register(new MissingConsentPreferenceStorageRule());
  registry.register(new MissingPersonalDataExportFormatRule());
  registry.register(new MissingPIIEncryptionAtRestRule());
  registry.register(new MissingPseudoAnonymizationRule());
  registry.register(new MissingCookiePreferencesRule());
  registry.register(new MissingDataMappingRule());
  registry.register(new MissingConsentRecordKeepingRule());
  registry.register(new MissingThirdPartyDataSharingDisclosureRule());
  registry.register(new MissingAgeGateRule());
  registry.register(new MissingSensitiveDataMaskingRule());
  registry.register(new MissingPrivacyNoticeLinkRule());
  registry.register(new MissingUserDataAccessDashboardRule());
  registry.register(new MissingBiometricConsentRule());
  registry.register(new MissingLocationConsentRule());

  // Frameworks (SOC2, PCI-DSS, HIPAA)
  registry.register(new MissingAuditTrailRule());
  registry.register(new MissingPHIAccessLogRule());
  registry.register(new MissingCSPHeaderRule());
  registry.register(new MissingSecurityHeadersRule());
  registry.register(new SensitiveEndpointRateLimitRule());
  registry.register(new MissingAPIVersioningRule());
  registry.register(new MissingCorsRestrictionRule());
  registry.register(new MissingDataEncryptionRule());
  registry.register(new CreditCardInLogsRule());
  registry.register(new CardDataInTransitRule());
  registry.register(new MissingAccountLockoutRule());
  registry.register(new MissingPasswordPolicyRule());
  registry.register(new MissingHealthCheckRule());
  registry.register(new MissingDataBackupRule());

  // Retention & Operations
  registry.register(new MissingDataRetentionRule());
  registry.register(new MissingDataPurgeRule());
  registry.register(new CrossBorderDataTransferRule());
  registry.register(new MissingProcessorRegisterRule());
  registry.register(new MissingVulnerabilityScanRule());
  registry.register(new MissingDependencyAuditRule());
  registry.register(new MissingSecretScanningRule());
  registry.register(new MissingAccessReviewRule());
  registry.register(new MissingSessionTimeoutRule());
  registry.register(new MissingMFARule());
  registry.register(new MissingLoginAttemptTrackingRule());
  registry.register(new MissingHIPAAAuthorizationRule());
  registry.register(new MissingPCIComplianceCheckRule());
  registry.register(new MissingSOC2MonitoringRule());
  registry.register(new MissingDisasterRecoveryRule());
  registry.register(new MissingChangeManagementRule());
  registry.register(new MissingVendorAssessmentRule());
  registry.register(new MissingEmployeeTrainingLogRule());
  registry.register(new MissingThirdPartyAccessLogRule());
  registry.register(new MissingDataRetentionPolicyHeaderRule());
  registry.register(new MissingIncidentResponsePlanRule());

  // ── COMPLIANCE MODERN EXTENSIONS (techniques 100-107) ──
  registry.register(new MissingAccessibilityStatementRule());
  registry.register(new MissingCookieConsentPreferencesRule());
  registry.register(new MissingPrivacyPolicyURule());
  registry.register(new MissingTermsOfServiceRule());
  registry.register(new MissingDataDeletionEndpointRule());
  registry.register(new MissingDataExportEndpointRule());
  registry.register(new MissingAgeVerificationRule());
  registry.register(new MissingSMTPAuthRule());

  // ── COMPLIANCE ADVANCED: Industry-Specific & Data Governance (techniques 245-258) ──
  registry.register(new MissingHIPAAAuthControlsRule());
  registry.register(new MissingPCIDSSCardDataRule());
  registry.register(new MissingSOC2AuditLoggingRule());
  registry.register(new MissingGDPRConsentStorageRule());
  registry.register(new MissingCCPARule());
  registry.register(new MissingDataBreachNotificationRule());
  registry.register(new MissingDataRetentionScheduleRule());
  registry.register(new IndustryDataProcessingRecordRule());
  registry.register(new MissingPseudonymizationRule());
  registry.register(new MissingCookieConsentGranularRule());
  registry.register(new MissingThirdPartyDataSharingRule());
  registry.register(new MissingDSARAutomationRule());
  registry.register(new MissingDataMinimizationCheckRule());
  registry.register(new MissingPrivacyByDesignRule());

  return registry;
}

export function createRuleEngine(registry?: RuleRegistry): RuleEngine {
  return new RuleEngine(registry || createRuleRegistry());
}

export { RuleEngine, RuleRegistry };
export type { Rule, RuleContext, RuleMeta, RuleFinding, RuleEngineReport, RuleCategory, RuleSeverity, TaintSlice } from './engine/types.js';
