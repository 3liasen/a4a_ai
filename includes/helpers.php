<?php
// header-clean
if ( ! defined( 'ABSPATH' ) ) { exit; }

function a4a_ai_excerpt( string $text, int $len = 140 ) : string {
    $text = wp_strip_all_tags( $text );
    if ( strlen( $text ) <= $len ) return $text;
    return rtrim( substr( $text, 0, $len - 1 ) ) . 'â€¦';
}


