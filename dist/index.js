import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image } from 'react-native';
import { PanGestureHandler, PinchGestureHandler, } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming, } from 'react-native-reanimated';
import ImageEditor from 'react-native-image-editor-next';
const PhotoCropper = (props) => {
    const { image, height = 1, onCropped, width = 1, grid, gridColor, gridHorizontalNum, gridVerticalNum, maxScale, } = props;
    const imageRatio = image.height / image.width;
    const viewRatio = height / width;
    const imageWidth = imageRatio > viewRatio ? width : height / imageRatio;
    const imageHeight = imageRatio > viewRatio ? width * imageRatio : height;
    const translation = {
        x: useSharedValue(imageRatio > viewRatio ? 0 : (width - imageWidth) / 2),
        y: useSharedValue(imageRatio > viewRatio ? (height - imageHeight) / 2 : 0),
        scale: useSharedValue(1),
        opacity: useSharedValue(1),
    };
    useEffect(() => {
        translation.opacity.value = 0;
        const _imageRatio = image.height / image.width;
        const _viewRatio = height / width;
        const _imageWidth = _imageRatio > _viewRatio ? width : height / _imageRatio;
        const _imageHeight = _imageRatio > _viewRatio ? width * _imageRatio : height;
        translation.x.value =
            _imageRatio > _viewRatio ? 0 : (width - _imageWidth) / 2;
        translation.y.value =
            _imageRatio > _viewRatio ? (height - _imageHeight) / 2 : 0;
        translation.scale.value = 1;
        setTimeout(() => {
            translation.opacity.value = withTiming(1, { duration: 250 });
        }, 200);
        onEnd();
    }, [image]);
    const onEnd = async () => {
        if (!width) {
            return;
        }
        if (!height) {
            return;
        }
        if (!maxScale) {
            return;
        }
        const clampedScale = translation.scale.value > maxScale
            ? maxScale
            : translation.scale.value < 1
                ? 1
                : translation.scale.value;
        const scaleWidth = (width * clampedScale - width) / (2 * clampedScale);
        const scaleHeight = (height * clampedScale - height) / (2 * clampedScale);
        let offsetX = translation.x.value; // dp
        let offsetY = translation.y.value; // dp
        if (translation.x.value < -(imageWidth - width + scaleWidth)) {
            translation.x.value = withSpring(-(imageWidth - width + scaleWidth));
            offsetX = -(imageWidth - width + scaleWidth);
        }
        if (translation.x.value > scaleWidth) {
            translation.x.value = withSpring(scaleWidth);
            offsetX = scaleWidth;
        }
        if (translation.y.value < -(imageHeight - height + scaleHeight)) {
            translation.y.value = withSpring(-(imageHeight - height + scaleHeight));
            offsetY = -(imageHeight - height + scaleHeight);
        }
        if (translation.y.value > scaleHeight) {
            translation.y.value = withSpring(scaleHeight);
            offsetY = scaleHeight;
        }
        if (translation.scale.value > maxScale) {
            translation.scale.value = withSpring(maxScale);
        }
        if (translation.scale.value < 1) {
            translation.scale.value = withSpring(1);
        }
        let x2 = 0; // px
        let y2 = 0; // px
        if (image.width / width < image.height / height) {
            x2 = image.width / clampedScale;
            y2 = x2 * viewRatio;
        }
        else {
            y2 = image.height / clampedScale;
            x2 = y2 / viewRatio;
        }
        offsetX -= scaleWidth;
        offsetY -= scaleHeight;
        offsetX = (-offsetX / width) * x2 * clampedScale; // px
        offsetY = (-offsetY / height) * y2 * clampedScale; // px
        // console.log('-----------------------------')
        // console.log('scale', clampedScale)
        // console.log('offsetX', offsetX)
        // console.log('offsetY', offsetY)
        // console.log('x2 dp', width)
        // console.log('y2 dp', height)
        // console.log('x1 px', image.width)
        // console.log('y2 px', image.height)
        // console.log('x2 px', x2)
        // console.log('y2 px', y2)
        // console.log('-----------------------------')
        const url = await ImageEditor.cropImage(image.uri, {
            size: {
                width: x2,
                height: y2,
            },
            offset: {
                x: offsetX,
                y: offsetY,
            },
        });
        onCropped && onCropped({
            originalUri: image.uri,
            croppedUri: url,
            croppedArea: { width: x2, height: y2, x: offsetX, y: offsetY }
        });
    };
    const panGestureHandler = useAnimatedGestureHandler({
        onStart: (_, ctx) => {
            ctx.startX = translation.x.value;
            ctx.startY = translation.y.value;
        },
        onActive: (event, ctx) => {
            translation.x.value = ctx.startX + event.translationX;
            translation.y.value = ctx.startY + event.translationY;
        },
        onEnd: (_) => {
            runOnJS(onEnd)();
        },
    });
    const pinchGestureHandler = useAnimatedGestureHandler({
        onStart: (_, ctx) => {
            ctx.startScale = translation.scale.value;
            ctx.startX = translation.x.value;
            ctx.startY = translation.y.value;
        },
        onActive: (event, ctx) => {
            translation.scale.value = ctx.startScale * event.scale;
        },
        onEnd: (_) => {
            runOnJS(onEnd)();
        },
    });
    const panStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translation.x.value },
                { translateY: translation.y.value },
            ],
        };
    });
    const pinchStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: translation.scale.value }],
            opacity: translation.opacity.value,
        };
    });
    return (React.createElement(View, { style: [styles.container, { width, height }] },
        React.createElement(PinchGestureHandler, { onGestureEvent: pinchGestureHandler },
            React.createElement(Animated.View, { style: [{ width, height }, pinchStyle] },
                React.createElement(Animated.View, { style: [{ width, height }] },
                    React.createElement(PanGestureHandler, { maxPointers: 1, onGestureEvent: panGestureHandler },
                        React.createElement(Animated.View, { style: [{ width, height }] },
                            React.createElement(Animated.View, { style: [{ width: imageWidth, height: imageHeight }, panStyle] },
                                React.createElement(Image, { style: { width: imageWidth, height: imageHeight }, source: image }))))))),
        grid && (React.createElement(React.Fragment, null,
            !!(height && gridVerticalNum) &&
                Array(gridVerticalNum)
                    .fill(0)
                    .map((v, i) => (React.createElement(View, { key: i, pointerEvents: "none", style: [
                        styles.gridVert,
                        {
                            width,
                            backgroundColor: gridColor,
                            top: (height / (gridVerticalNum + 1)) * (i + 1),
                        },
                    ] }))),
            !!(height && gridHorizontalNum) &&
                Array(gridHorizontalNum)
                    .fill(0)
                    .map((v, i) => (React.createElement(View, { key: i, pointerEvents: "none", style: [
                        styles.gridHorz,
                        {
                            height,
                            backgroundColor: gridColor,
                            left: (width / (gridHorizontalNum + 1)) * (i + 1),
                        },
                    ] })))))));
};
PhotoCropper.defaultProps = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
    grid: true,
    gridVerticalNum: 2,
    gridHorizontalNum: 2,
    gridColor: '#fff',
    maxScale: 2,
};
export default PhotoCropper;
const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    gridVert: {
        height: 1,
        position: 'absolute',
    },
    gridHorz: {
        width: 1,
        position: 'absolute',
    },
});
