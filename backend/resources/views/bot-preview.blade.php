{{-- Bot-only response — see App\Http\Controllers\Api\BotPreviewController
     and frontend/nginx.conf. Never linked to, never shown to a real
     browser. Bare <head>, no app shell, no business logic beyond what the
     controller already resolved. Every interpolated value below goes
     through Blade's {{ }}, which auto-escapes via htmlspecialchars — a
     structural guarantee, not a per-call discipline. --}}
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @if($description)
        <meta name="description" content="{{ $description }}">
    @endif
    <link rel="canonical" href="{{ $canonicalUrl }}">

    <meta property="og:type" content="{{ $type }}">
    <meta property="og:title" content="{{ $title }}">
    @if($description)
        <meta property="og:description" content="{{ $description }}">
    @endif
    <meta property="og:url" content="{{ $canonicalUrl }}">
    <meta property="og:site_name" content="{{ $siteTitle }}">
    @if($ogImage)
        <meta property="og:image" content="{{ $ogImage }}">
    @endif

    <meta name="twitter:card" content="summary_large_image">
    @if($twitterHandle)
        <meta name="twitter:site" content="{{ '@'.$twitterHandle }}">
    @endif
    <meta name="twitter:title" content="{{ $title }}">
    @if($description)
        <meta name="twitter:description" content="{{ $description }}">
    @endif
    @if($ogImage)
        <meta name="twitter:image" content="{{ $ogImage }}">
    @endif
</head>
<body>
<!-- Bot-preview-only response; see routes/api.php and BotPreviewController. -->
</body>
</html>
