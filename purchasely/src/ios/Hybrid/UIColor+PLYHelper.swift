import Foundation
import UIKit

extension UIColor {
    @objc(ply_fromHex:)
    static func plyFromHex(_ hex: String) -> UIColor? {
        var text = (hex as NSString).trimmingCharacters(in: .whitespacesAndNewlines) as NSString
        if text.length == 0 { return nil }
        if text.character(at: 0) == 35 {
            text = text.substring(from: 1) as NSString
        }
        guard text.length == 6 || text.length == 8 else { return nil }

        // Match NSScanner.scanHexInt from the Objective-C bridge: scan a valid hex prefix,
        // ignore the success flag, and treat a failed scan as zero.
        let scanner = Scanner(string: text as String)
        var colorCode: UInt32 = 0
        _ = scanner.scanHexInt32(&colorCode)

        let red: UInt32
        let green: UInt32
        let blue: UInt32
        let alpha: UInt32
        if text.length == 6 {
            red = (colorCode >> 16) & 0xff
            green = (colorCode >> 8) & 0xff
            blue = colorCode & 0xff
            alpha = 0xff
        } else {
            red = (colorCode >> 24) & 0xff
            green = (colorCode >> 16) & 0xff
            blue = (colorCode >> 8) & 0xff
            alpha = colorCode & 0xff
        }
        return UIColor(
            red: CGFloat(red) / 255,
            green: CGFloat(green) / 255,
            blue: CGFloat(blue) / 255,
            alpha: CGFloat(alpha) / 255
        )
    }
}
