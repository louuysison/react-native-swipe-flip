'use strict';

import React, { Component, PropTypes } from 'react';

import {
  View,
  Easing,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';

import SimpleGesture from 'react-native-simple-gesture';

// Not exported
var swipeDirection = null;

var pressAction = null;

export default class SwipeFlip extends Component {
  constructor(props) {
    super(props);

    const rotation = {
        frontRotation: 0,
        backRotation: 0.5,
        frontOpacity: 1,
        backOpacity: 0,
    };

    const frontRotationAnimatedValue = new Animated.Value(rotation.frontRotation);
    const backRotationAnimatedValue = new Animated.Value(rotation.backRotation);

    const frontOpacityAnimatedValue = new Animated.Value(rotation.frontOpacity);
    const backOpacityAnimatedValue = new Animated.Value(rotation.backOpacity);

    const interpolationConfig = { inputRange: [0, 1], outputRange: ['0deg', '360deg'] };
    const frontRotation = frontRotationAnimatedValue.interpolate(interpolationConfig);
    const backRotation = backRotationAnimatedValue.interpolate(interpolationConfig);

    const opacityInterpolationConfig = { inputRange: [0, 1], outputRange: [0, 1] };
    const frontOpacity = frontOpacityAnimatedValue.interpolate(opacityInterpolationConfig);
    const backOpacity = backOpacityAnimatedValue.interpolate(opacityInterpolationConfig);

    this.state = {
        frontRotationAnimatedValue,
        backRotationAnimatedValue,
        frontRotation,
        backRotation,
        rotation,
        isFlipped: props.isFlipped,
        rotateProperty: 'rotateY'
    };

    if (Platform.OS === 'android') {
      Object.assign(this.state, {
        frontOpacityAnimatedValue,
        backOpacityAnimatedValue,
        frontOpacity,
        backOpacity
      });
    }
  }

  componentWillMount() {
      this._panResponder = PanResponder.create({
          onStartShouldSetPanResponder: (evt, gestureState) => {
            if (
              Platform.OS == 'android'
              && (gestureState.dx < 1 && gestureState.dx > -1)
              && (gestureState.dy < 1 && gestureState.dy > -1)
            ) {
              return false;
            }
            return true;
          },
          onStartShouldSetPanResponderCapture: (evt, gestureState) => {
            return gestureState.dx != 0 && gestureState.dy != 0;
          },
          onMoveShouldSetPanResponder: (evt, gestureState) => true,
          onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
            return gestureState.dx != 0 && gestureState.dy != 0;
          },
          onPanResponderGrant: (evt, gestureState) => {
              // do stuff on start -- unused
          },
          onPanResponderMove: (evt, gestureState) => {
              // do stuff on move -- unused
          },
          onPanResponderTerminationRequest: (evt, gestureState) => true,
          onPanResponderRelease: (evt, gestureState) => {
            if(gestureState.dx == 0 && gestureState.dy == 0) {
              if(this.props.onPress){
                this.props.onPress();
              }
            } else {
              this._onSwipe(evt, gestureState);
            }
          },
          onPanResponderTerminate: (evt, gestureState) => {
          },
          onShouldBlockNativeResponder: (evt, gestureState) => {
              return true;
          }
      });
    }

    _onSwipe(evt, gestureState) {
        const sgs = new SimpleGesture(evt, gestureState);

        swipeDirection = sgs.isSwipeLeft() ? 'left' :
                             sgs.isSwipeRight() ? 'right' : null;

        if(swipeDirection) {
            this.setState({ rotateProperty: (swipeDirection === 'left' || swipeDirection === 'right') ? 'rotateY' : 'rotateX' });
            this.flip(swipeDirection);
        }
    }

    _getTargetRenderState(swipeDirection) {
      const rotation = swipeDirection ? {
          frontRotation: (swipeDirection === 'right' || swipeDirection === 'up') ? this.state.rotation.frontRotation + 0.5 : this.state.rotation.frontRotation - 0.5,
          backRotation: (swipeDirection === 'right' || swipeDirection === 'up') ? this.state.rotation.backRotation + 0.5 : this.state.rotation.backRotation - 0.5,
          frontOpacity: this.state.rotation.backOpacity,
          backOpacity: this.state.rotation.frontOpacity,
      } : this.state.rotation;

      this.setState({rotation: rotation})
      return rotation;

    };

    _getFrontRotation() {
      return this.state.frontRotation;
    }

    _getBackRotation() {
      return this.state.backRotation;
    }

    render() {
        return (
            <View {...this.props} { ...this._panResponder.panHandlers }>
                <Animated.View
                  pointerEvents={ this.state.isFlipped ? 'none' : 'auto' }
                  style={[
                    styles.flippableView,
                    Platform.select({
                     android: {
                       opacity: this.state.frontOpacity
                     }
                    }),
                    {
                     transform: [
                       { perspective: this.props.perspective },
                       { [this.state.rotateProperty]: this._getFrontRotation() }
                     ]
                    } ]}>
                  { this.props.front }
                </Animated.View>
                <Animated.View
                  pointerEvents={ this.state.isFlipped ? 'auto' : 'none' }
                  style={[
                    styles.flippableView,
                    Platform.select({
                      android: {
                        opacity: this.state.backOpacity
                      }
                    }),
                    {
                      transform: [
                        { perspective: this.props.perspective },
                        {[this.state.rotateProperty]: this._getBackRotation() }
                      ]
                    }
                  ]}>
                  { this.props.back }
                </Animated.View>
            </View>
        );
    }

    flip(swipeDirection, auto = false) {
        if (!auto) this.props.onFlip();

        if( ['up', 'down', 'left', 'right'].indexOf(swipeDirection) === -1 ) {
            swipeDirection = 'right';
        }

        const nextIsFlipped = !this.state.isFlipped;

        const { frontRotation, backRotation, frontOpacity, backOpacity } = this._getTargetRenderState(swipeDirection);

        let animations = [
          this._animateValue(this.state.frontRotationAnimatedValue, frontRotation, this.props.flipEasing),
          this._animateValue(this.state.backRotationAnimatedValue, backRotation, this.props.flipEasing)
        ]

        if (Platform.OS === 'android') {
          animations = [
            ...animations,
            this._animateValue(this.state.frontOpacityAnimatedValue, frontOpacity, this.props.flipEasing, 100),
            this._animateValue(this.state.backOpacityAnimatedValue, backOpacity, this.props.flipEasing, 100)
          ];
        }

        setImmediate(() => {
            requestAnimationFrame(() => {
                Animated.parallel(animations).start(k => {
                    if (!k.finished) { return; }

                    this.setState({ isFlipped: nextIsFlipped });
                    if (!auto) this.props.onFlipped(nextIsFlipped);
                });
            });
        });
    }

    _animateValue(animatedValue, toValue, easing, delay = 0) {
        return Animated.timing(
            animatedValue,
            {
                toValue: toValue,
                duration: this.props.flipDuration,
                easing: easing,
                delay: delay,
            }
        );
    }
}

SwipeFlip.defaultProps = {
    style: {},
    flipDuration: 500,
    flipEasing: Easing.out(Easing.ease),
    perspective: 1000,
    onFlip: () => {},
    onFlipped: () => {}
};

SwipeFlip.propTypes = {
    style: View.propTypes.style,
    flipDuration: PropTypes.number,
    flipEasing: PropTypes.func,
    front: PropTypes.object,
    back: PropTypes.object,
    perspective: PropTypes.number,
    onFlip: PropTypes.func,
    onFlipped: PropTypes.func
};

const styles = StyleSheet.create({
    flippableView: {
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        backfaceVisibility: 'hidden'
    }
});
