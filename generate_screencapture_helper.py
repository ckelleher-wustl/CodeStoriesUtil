from playwright.sync_api import sync_playwright

class ScreenCapture:
    def capture(self, url, output_file):
        try:
            with sync_playwright() as playwright:
                chromium = playwright.chromium  # or "firefox" or "webkit".
                browser = chromium.launch().new_context()
                page = browser.new_page()
                page.set_viewport_size({"width": 1920, "height": 1080})
                page.goto(url, wait_until="load")
                page.screenshot(path=output_file)
                browser.close()
                output_file = output_file.split('/' or '\\')[-1]
        except Exception as e:
            print(e)
            output_file = output_file.split('/' or '\\')[-1]
            output_file = output_file.replace('.png', '-need-manual.png')
        return output_file