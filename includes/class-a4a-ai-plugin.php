<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

// Compatibility stub: the primary A4A_AI_Plugin class lives in a4a_ai.php.
// If this file is loaded, bail out to avoid redeclaration fatals.
if ( class_exists( 'A4A_AI_Plugin', false ) ) {
    return;
}
