<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Single-row table (see App\Models\SiteSettings::current()) — no
        // user_id/ownership concept, this is site-wide, not per-account.
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('site_title');
            $table->text('meta_description')->nullable();
            $table->string('og_image_path')->nullable();
            $table->string('twitter_handle')->nullable();
            $table->string('favicon_ico_path')->nullable();
            $table->string('favicon_png_path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
