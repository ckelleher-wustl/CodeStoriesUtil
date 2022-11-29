# https://stackoverflow.com/questions/55231170/taking-a-screenshot-of-a-web-page-in-pyqt5
from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import Qt, QUrl, QTimer
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineSettings


class Screenshot(QWebEngineView):
    def capture(self, url, output_file):
        self.output_file = output_file
        self.load(QUrl(url))
        self.loadFinished.connect(self.on_loaded)
        # Create hidden view without scrollbars
        self.setAttribute(Qt.WA_DontShowOnScreen)
        self.page().settings().setAttribute(QWebEngineSettings.ShowScrollBars, True)
        self.page().settings().setAttribute(QWebEngineSettings.PluginsEnabled, True)
        self.page().settings().setAttribute(QWebEngineSettings.PdfViewerEnabled, True)
        self.show()

    def on_loaded(self):
        size = QApplication.primaryScreen().size()
        # size = self.page().contentsSize().toSize()

        if size.width() >= 1920 and size.height() >= 1080:
            self.resize(1920, 1080)
        else:
            self.resize(size)

        # Wait for resize
        QTimer.singleShot(3000, self.take_screenshot)

    def take_screenshot(self):
        self.grab().save(self.output_file, b'PNG')
        self.app.quit()
