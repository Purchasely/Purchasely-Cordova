import UIKit

extension UIViewController {
    @objc(close)
    func close() {
        dismiss(animated: true, completion: nil)
    }
}
